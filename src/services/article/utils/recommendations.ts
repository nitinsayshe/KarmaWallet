import { Schema, Types } from 'mongoose';
import { getUtcDate } from '../../../lib/date';
import { ICompany, ICompanyDocument } from '../../../models/company';
import { TransactionModel } from '../../../models/transaction';
import { IUserDocument } from '../../../models/user';
import { IWPArticle, WPArticleModel } from '../../../models/wpArticle';
import { IRef } from '../../../types/model';

export type URLs = string[];

// takes a list of company ids and returns a subset of the ones that the user has shopped at
export const getMatchingTransactionCompaniesInDateRange = async (
  userId: Types.ObjectId,
  companies: Types.ObjectId[],
  startDate?: Date,
  endDate?: Date,
): Promise<(ICompany & { _id: Types.ObjectId }
  )[]> => {
  if (!userId || !companies || !companies.length) return [];
  try {
    const matchClause: { $and: any[] } = { $and: [{ user: userId }, { company: { $in: companies } }] };
    if (!!startDate) matchClause.$and.push({ date: { $gte: startDate } });
    if (!!endDate) matchClause.$and.push({ date: { $lte: endDate } });

    const companiesShoppedAt = await TransactionModel.aggregate()
      .match(matchClause)
      .lookup({
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      })
      .unwind({ path: '$company' })
      .group({
        _id: '$company._id',
        company: { $first: '$company' },
      });

    return !!companiesShoppedAt && !!companiesShoppedAt.length ? companiesShoppedAt.map((c) => ({ ...c.company })) : [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getCompaniesWithArticles = async (): Promise<(ICompany & { _id: Types.ObjectId })[]> => {
  const companies = await WPArticleModel.aggregate([
    {
      $match: {
        'acf.companies': {
          $exists: true,
          $not: {
            $size: 0,
          },
        },
      },
    },
    {
      $project: {
        companies: '$acf.companies',
      },
    },
    {
      $unwind: {
        path: '$companies',
      },
    },
    {
      $group: {
        _id: '$companies',
        company: {
          $first: '$companies',
        },
      },
    },
    {
      $project: {
        company: {
          $toObjectId: '$company',
        },
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    {
      $unwind: {
        path: '$company',
      },
    },
  ]);

  return companies.map((company) => ({
    ...company.company,
  }));
};

export const getCompaniesWithArticlesUserShopsAt = async (
  userId: Types.ObjectId,
  startDate?: Date,
  endDate?: Date,
  companiesWithArticles?: ICompany[],
): Promise<(ICompany & { _id: Types.ObjectId }
  )[]> => {
  if (!companiesWithArticles) {
    companiesWithArticles = await getCompaniesWithArticles();
  }
  // pull user transactions within the given date range
  // filtered by the companies with articles
  // grouped by company
  return getMatchingTransactionCompaniesInDateRange(
    userId,
    companiesWithArticles.map((c) => c._id as unknown as Types.ObjectId),
    startDate,
    endDate,
  );
};

export type ArticleWithCompany = {
  _id: Types.ObjectId; // article id
  company: ICompany; // company
  link: string; // article link
};

export const getArticlesForCompany = async (company: ICompany): Promise<ArticleWithCompany[]> => {
  try {
    const articles = await WPArticleModel.aggregate()
      .match({
        'acf.companies': company._id.toString(),
      })
      .project({
        _id: 1,
        company: company._id,
        link: 1,
      })
      .lookup({
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      })
      .unwind('company');

    if (!articles?.length || !articles?.[0]?.company?.companyName) return [];
    return articles;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const queueArticlesForUser = async (user: IUserDocument, articles: Types.ObjectId[]): Promise<void> => {
  if (!user || !articles || !articles.length) return;
  try {
    const queuedArticles = articles.map((article) => ({
      article: article as unknown as IRef<Schema.Types.ObjectId, IWPArticle>,
      date: getUtcDate().toDate(),
    }));

    if (!user.articles) user.articles = {};
    if (!user.articles?.queued) user.articles.queued = [];
    user?.articles?.queued?.push(...queuedArticles);

    await user.save();
  } catch (e) {
    console.error(e);
  }
};

export const getArticleRecommendationsBasedOnTransactionHistory = async (
  user: IUserDocument,
  startDate?: Date,
  endDate?: Date,
  articlesByCompany?: ArticleWithCompany[][],
): Promise<URLs> => {
  if (!user) return [];

  if (!articlesByCompany) {
    // take companies with articles as a param
    const companiesWithArticles = await getCompaniesWithArticles();
    // each element in the array holds the articles for a given company
    articlesByCompany = await Promise.all(companiesWithArticles.map(async (company) => getArticlesForCompany(company)));
  }

  // filter out any articles wihout company associations
  articlesByCompany = articlesByCompany
    .map((articles) => articles.filter((article) => !!article?.company))
    .filter((articles) => !!articles?.length);

  // filter out any articles that were queued within the date range
  const articlesNotInDateRange = user.articles?.queued?.filter((article) => {
    if (!startDate && !endDate) return true;
    if (!!startDate && !!endDate) return article.date < startDate || article.date > endDate;
    if (!!startDate && article.date < startDate) return true;
    if (!!endDate && article.date > endDate) return true;

    return false;
  });

  // get queued user articles
  const queuedUserArticleIds = articlesNotInDateRange?.map((article) => article.article);

  // filter out any that we've already sent the user.
  if (!!queuedUserArticleIds?.length && queuedUserArticleIds.length > 0) {
    articlesByCompany = articlesByCompany
      .map((articles) => articles.filter((article) => !queuedUserArticleIds?.find((a) => a.toString() === article._id.toString())))
      .filter((articles) => articles?.length > 0);
  }

  if (!articlesByCompany?.length || articlesByCompany.length <= 0) {
    return [];
  }
  // get a list of the companies
  const companiesWithArticles = articlesByCompany.map((articles) => articles[0].company as ICompany);

  const companiesUserShopsAtAndHaveArticles = await getCompaniesWithArticlesUserShopsAt(
    user._id,
    startDate,
    endDate,
    companiesWithArticles,
  );

  if (!companiesUserShopsAtAndHaveArticles?.length) {
    return [];
  }

  const articlesToQueue = articlesByCompany
    .filter((articles) => {
      const company = companiesUserShopsAtAndHaveArticles.find(
        (c) => c?._id?.toString() === (articles?.[0]?.company as unknown as ICompanyDocument)?._id?.toString(),
      );
      return !!company;
    })
    .flat()
    .map((article) => article._id)
    .filter((article, index, articles) => articles.findIndex((article2) => article2.toString() === article.id.toString()) === index);

  if (!!articlesToQueue?.length) {
    await queueArticlesForUser(user, articlesToQueue);
  }

  const articleURLs = companiesUserShopsAtAndHaveArticles.map((company) => {
    const articles = articlesByCompany.find((a) => company._id.equals((a[0].company as unknown as ICompanyDocument)._id.toString()));
    if (!articles) {
      return [];
    }
    return articles.map((article) => article.link);
  });

  if (!articleURLs.length) {
    return [];
  }

  return articleURLs.flat();
};
