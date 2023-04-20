import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as ArticleService from '../services/article';
import * as CompanyService from '../services/company';
import { ICompanyDocument } from '../models/company';

export const getArticleById: IRequestHandler<ArticleService.IGetArticleParams> = async (req, res) => {
  try {
    const article = await ArticleService.getArticleById(req);
    const _article = article.toObject();
    _article.company = CompanyService.getShareableCompany(_article.company as ICompanyDocument);
    api(req, res, _article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getAllArticles: IRequestHandler = async (req, res) => {
  try {
    const articles = await ArticleService.getAllArticles(req);
    api(req, res, articles);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
