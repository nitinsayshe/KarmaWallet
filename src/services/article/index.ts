import { isValidObjectId } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { ArticleModel } from '../../models/article';
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
  }]);

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
