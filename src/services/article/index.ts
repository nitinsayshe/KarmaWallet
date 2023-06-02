import { isValidObjectId } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { ArticleHeaderTypes, ArticleModel, IArticle } from '../../models/article';
import { CompanyModel } from '../../models/company';
import { MerchantModel } from '../../models/merchant';
import { SectorModel } from '../../models/sector';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';
import { toUTC } from '../../lib/date';

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
}

export const getArticleById = async (req: IRequest<IGetArticleParams, {}, {}>) => {
  const { articleId } = req.params;

  if (!articleId) throw new CustomError('Article id required', ErrorTypes.INVALID_ARG);
  if (!isValidObjectId(articleId)) throw new CustomError('Invalid article id provided', ErrorTypes.INVALID_ARG);

  const article = await ArticleModel.findOne({ _id: articleId });

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

export const getAllArticles = async (_req: IRequest) => {
  const articles = await ArticleModel.find({ }).populate([{
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
  const randomArticle = await ArticleModel.aggregate([{ $sample: { size: 1 } }]);

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

// TODO: sanitize input for html

export const createArticle = async (req: IRequest) => {}; //eslint-disable-line

export const updateArticle = async (req: IRequest<IGetArticleParams, {}, IUpdateArticleRequestBody>) => {
  const { title, publishedOn, introParagraph, featured, headerBackground, body, headerTitle, listViewImage, description, enabled } = req.body;
  if (!title) throw new CustomError('No updatable data found for article.', ErrorTypes.INVALID_ARG);
  const updates: Partial<IArticle> = {
    lastModified: toUTC(new Date()),
  };

  if (title) updates.title = title;
  if (introParagraph) updates.introParagraph = introParagraph;
  if (featured) updates.featured = featured;
  if (headerBackground) updates.headerBackground = headerBackground;

  if (body) {
    // Run body through sanitizer on back end as well
    const sanitizedBody = body;
    updates.body = sanitizedBody;
  }

  if (headerTitle) updates.headerTitle = headerTitle;
  if (listViewImage) updates.listViewImage = listViewImage;
  if (description) updates.description = description;
  if (enabled) updates.enabled = enabled;
  if (publishedOn) updates.publishedOn = publishedOn;

  return ArticleModel.findByIdAndUpdate(req.params.articleId, updates, { new: true });
};

export const deleteArticle = async (req: IRequest) => {}; //eslint-disable-line

export const getArticleHeaderTypes = async (_req: IRequest) => Object.values(ArticleHeaderTypes);
