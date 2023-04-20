import { isValidObjectId } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { ArticleModel, IArticle } from '../../models/article';
import { CompanyModel } from '../../models/company';
import { MerchantModel } from '../../models/merchant';
import { SectorModel } from '../../models/sector';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';

export interface IGetArticleParams {
  articleId: string;
}

export const getArticleById = async (req: IRequest<IGetArticleParams, {}, {}>) => {
  const { articleId } = req.params;

  if (!articleId) throw new CustomError('Article id required', ErrorTypes.INVALID_ARG);
  if (!isValidObjectId(articleId)) throw new CustomError('Invalid article id provided', ErrorTypes.INVALID_ARG);

  const article = await ArticleModel.findOne({ _id: articleId }).populate([{
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
  if (!article) throw new CustomError('Article not found', ErrorTypes.NOT_FOUND);
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
  }]);

  return articles;
};

export const createArticle = async (_req: IRequest, _body: IArticle) => {
  const { introParagraph, company, bannerImageUrl, theBad, theGood } = _body;

  try {
    const result = await ArticleModel.create({
      introParagraph,
      company,
      bannerImageUrl,
      theBad,
      theGood,
    });
    return result;
  } catch (err) {
    throw asCustomError(err);
  }
};
