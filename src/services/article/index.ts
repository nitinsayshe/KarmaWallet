import { asCustomError } from '../../lib/customError';
import { ArticleModel } from '../../models/article';
import { IRequest } from '../../types/request';

export const getArticleById = async (_req: IRequest, articleId: string) => {
  try {
    const result = await ArticleModel.findOne({ _id: articleId });
    return result;
  } catch (err) {
    throw asCustomError(err);
  }
};
