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
    const articles = await ArticleService.getAllArticles(req);
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

export const getRandomArticle: IRequestHandler<ArticleService.IGetArticleParams> = async (req, res) => {
  try {
    const article = await ArticleService.getRandomArticle(req);
    const _article = article.toObject();
    if (_article.company) _article.company = CompanyService.getShareableCompany(_article.company as ICompanyDocument);
    api(req, res, _article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const updateArticle: IRequestHandler<ArticleService.IGetArticleParams, {}, ArticleService.IUpdateArticleRequestBody> = async (req, res) => {
  try {
    const article = await ArticleService.updateArticle(req);
    api(req, res, article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};

export const createArticle: IRequestHandler<{}, {}, ArticleService.IUpdateArticleRequestBody> = async (req, res) => {
  try {
    const article = await ArticleService.createArticle(req);
    api(req, res, article);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
