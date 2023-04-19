import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as ArticleService from '../services/article';
import * as CompanyService from '../services/company';
import { ICompanyDocument } from '../models/company';

export const getArticleById: IRequestHandler<ArticleService.IGetArticleParams> = async (req, res) => {
  try {
    const article = await ArticleService.getArticleById(req);
    article.company = CompanyService.getShareableCompany(article.company as ICompanyDocument);
    api(req, res, article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
