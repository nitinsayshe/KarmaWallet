import { isValidObjectId } from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { ArticleHeaderTypes, ArticleModel, ArticleTypes } from '../../models/article';
import { CompanyModel } from '../../models/company';
import { MerchantModel } from '../../models/merchant';
import { SectorModel } from '../../models/sector';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';
import { getUtcDate } from '../../lib/date';
import { ArticleTemplateModel } from '../../models/articleTemplate';

export interface IGetArticleParams {
  articleId: string;
}

export interface IUpdateArticleRequestBody {
  title?: string;
  publishedOn? : Date;
  introParagraph?: string;
  enabled?: boolean;
  description?: string;
  featured?: boolean;
  headerBackground?: string;
  listViewImage?: string;
  headerTitle?: string;
  body?: string;
  headerType?: ArticleHeaderTypes;
  headerLogo?: string;
  deleted?: boolean;
  type?: ArticleTypes;
  company?: string;
}

export const getArticleById = async (req: IRequest<IGetArticleParams, {}, {}>, isAdmin = false) => {
  const { articleId } = req.params;

  if (!articleId) throw new CustomError('Article id required', ErrorTypes.INVALID_ARG);
  if (!isValidObjectId(articleId)) throw new CustomError('Invalid article id provided', ErrorTypes.INVALID_ARG);

  const query = isAdmin ? { _id: articleId, deleted: false } : { _id: articleId, enabled: true, deleted: false };
  const article = await ArticleModel.findOne(query);

  if (!article) throw new CustomError('Article not found', ErrorTypes.NOT_FOUND);

  if (!!article.company) {
    await article.populate([{
      path: 'company',
      model: CompanyModel,
      populate: [
        {
          path: 'merchant',
          model: MerchantModel,
        },
        {
          path: 'evaluatedUnsdgs.unsdg',
          model: UnsdgModel,
          populate: [{
            path: 'subCategory',
            model: UnsdgSubcategoryModel,
            populate: [{
              path: 'category',
              model: UnsdgCategoryModel,
            }],
          }],
        },
        {
          path: 'parentCompany',
          model: CompanyModel,
          populate: [
            {
              path: 'sectors.sector',
              model: SectorModel,
            },
          ],
        },
        {
          path: 'sectors.sector',
          model: SectorModel,
        },
        {
          path: 'categoryScores.category',
          model: UnsdgCategoryModel,
        },
        {
          path: 'subcategoryScores.subcategory',
          model: UnsdgSubcategoryModel,
        },
      ],
    }]);
  }
  return article;
};

export const getAllArticles = async (_req: IRequest, isAdmin = false) => {
  const query = isAdmin ? { deleted: false } : { enabled: true, deleted: false };
  const articles = await ArticleModel.find(query).populate([{
    path: 'company',
    model: CompanyModel,
    populate: [
      {
        path: 'merchant',
        model: MerchantModel,
      },
      {
        path: 'evaluatedUnsdgs.unsdg',
        model: UnsdgModel,
        populate: [{
          path: 'subCategory',
          model: UnsdgSubcategoryModel,
          populate: [{
            path: 'category',
            model: UnsdgCategoryModel,
          }],
        }],
      },
      {
        path: 'parentCompany',
        model: CompanyModel,
        populate: [
          {
            path: 'sectors.sector',
            model: SectorModel,
          },
        ],
      },
      {
        path: 'sectors.sector',
        model: SectorModel,
      },
      {
        path: 'categoryScores.category',
        model: UnsdgCategoryModel,
      },
      {
        path: 'subcategoryScores.subcategory',
        model: UnsdgSubcategoryModel,
      },
    ],
  }]).sort({ publishedOn: -1 });

  return articles;
};

export const getRandomArticle = async (_req: IRequest) => {
  const randomArticle = await ArticleModel.aggregate([
    { $match: { enabled: true, deleted: false } },
    { $sample: { size: 1 } },
  ]);

  if (randomArticle.length === 0) throw new CustomError('Article not found', ErrorTypes.NOT_FOUND);

  const mockRequest = ({
    ..._req,
    params: {
      articleId: randomArticle[0]._id,
    },
  } as IRequest);

  const article = await getArticleById(mockRequest as IRequest<IGetArticleParams, {}, {}>);

  return article;
};

export const createArticle = async (req: IRequest<{}, {}, IUpdateArticleRequestBody>) => {
  const { title, introParagraph, featured, headerBackground, body, headerTitle, listViewImage, description, enabled, type, headerLogo, headerType, company } = req.body;

  const isValidCompany = await CompanyModel.findOne({ _id: company });

  if (!isValidCompany) throw new CustomError('Invalid company id provided', ErrorTypes.INVALID_ARG);

  const requiredFields = [title, introParagraph, headerBackground, body, headerTitle, listViewImage, description, type, headerLogo, headerType];
  requiredFields.forEach((field) => {
    if (req.body[field as keyof IUpdateArticleRequestBody] === undefined) throw new CustomError('No updatable data found for article.', ErrorTypes.INVALID_ARG);
  });

  const article = new ArticleModel({
    title,
    publishedOn: enabled ? getUtcDate().toDate() : null,
    introParagraph,
    featured,
    headerBackground,
    body: sanitizeHtml(body),
    headerTitle,
    listViewImage,
    description,
    enabled,
    lastModified: getUtcDate().toDate(),
    type,
    headerLogo,
    headerType,
    createdOn: getUtcDate().toDate(),
    company,
  });

  await article.save();
  return article;
};

export const updateArticle = async (req: IRequest<IGetArticleParams, {}, IUpdateArticleRequestBody>) => {
  const { title, introParagraph, featured, headerBackground, body, headerTitle, listViewImage, description, enabled, deleted, type, headerLogo, headerType } = req.body;

  const article = await ArticleModel.findOne({ _id: req.params.articleId });

  if (!article) throw new CustomError('Article not found', ErrorTypes.NOT_FOUND);

  if (title) article.title = title;
  if (introParagraph) article.introParagraph = introParagraph;
  if (featured) article.featured = featured;
  if (headerBackground) article.headerBackground = headerBackground;

  if (body) {
    // Run body through sanitizer on back end as well
    const sanitizedBody = sanitizeHtml(body, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) });
    article.body = sanitizedBody;
  }

  if (headerTitle) article.headerTitle = headerTitle;
  if (listViewImage) article.listViewImage = listViewImage;
  if (description) article.description = description;
  if (enabled !== undefined) {
    article.enabled = enabled;
    if (enabled && !article.publishedOn) article.publishedOn = getUtcDate().toDate();
  }
  if (deleted !== undefined) article.deleted = deleted;
  if (headerType && !!Object.values(ArticleHeaderTypes).find(t => headerType === t)) article.headerType = headerType;
  if (type && !!Object.values(ArticleTypes).find(t => type === t)) article.type = type;
  if (headerLogo) article.headerLogo = headerLogo;
  article.lastModified = getUtcDate().toDate();

  await article.save();
  return article;
};

export const getArticleHeaderTypes = async (_req: IRequest) => Object.values(ArticleHeaderTypes);

export const getAllArticleTemplates = async (_req: IRequest) => ArticleTemplateModel.find({});
