import { asCustomError } from '../../lib/customError';
import { ArticleModel, ITheBad, ITheGood } from '../../models/article';
import { IRequest } from '../../types/request';

interface IArticleData {
  companyId: string,
  dateWritten: string,
  bannerImageUrl: string,
  introParagraph: string,
  theGood: ITheGood[],
  theBad: ITheBad[],
}

export const getArticleById = async (_req: IRequest, articleId: string) => {
  try {
    const result = await ArticleModel.findOne({ _id: articleId });
    return result;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const createArticle = async (_req: IRequest, _body: IArticleData) => {
  try {
    const result = await ArticleModel.create({
      introParagraph: _body.introParagraph,
      companyId: _body.companyId,
      dateWritten: _body.dateWritten,
      bannerImageUrl: _body.bannerImageUrl,
      theBad: _body.theBad,
      theGood: _body.theGood,
    });
    return result;
  } catch (err) {
    throw asCustomError(err);
  }
};
