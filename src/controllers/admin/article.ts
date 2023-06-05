import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as ArticleService from '../../services/article';
import * as CompanyService from '../../services/company';
import { ICompanyDocument } from '../../models/company';

export const getArticleById: IRequestHandler<ArticleService.IGetArticleParams> = async (req, res) => {
  try {
    const article = await ArticleService.getArticleById(req, true);
    const _article = article.toObject();
    if (!!article.company) {
      _article.company = CompanyService.getShareableCompany(_article.company as ICompanyDocument);
    }
    api(req, res, _article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const getAllArticles: IRequestHandler = async (req, res) => {
  try {
    const articles = await ArticleService.getAllArticles(req, true);
    const _articles = articles.map((article) => {
      const _article = article.toObject();
      if (!!article.company) {
        _article.company = CompanyService.getShareableCompany(_article.company as ICompanyDocument);
      }
      return _article;
    });
    api(req, res, _articles);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateArticle: IRequestHandler<ArticleService.IGetArticleParams, {}, ArticleService.IUpdateArticleRequestBody> = async (req, res) => {
  try {
    const article = await ArticleService.updateArticle(req);
    const _article = article.toObject();
    api(req, res, _article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const createArticle: IRequestHandler<{}, {}, ArticleService.IUpdateArticleRequestBody> = async (req, res) => {
  try {
    const article = await ArticleService.createArticle(req);
    const _article = article.toObject();
    api(req, res, _article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
