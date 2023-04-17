import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as ArticleService from '../services/article';

export const getArticleById: IRequestHandler<{ articleId: string }> = async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await ArticleService.getArticleById(req, articleId);
    console.log(article);
    api(req, res, article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
