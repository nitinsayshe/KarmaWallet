import { api, error } from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as ArticleService from '../services/article';
import { verifyRequiredFields } from '../lib/requestData';
import { ErrorTypes } from '../lib/constants';
import * as output from '../services/output';
import { IArticle } from '../models/article';

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

export const createArticle: IRequestHandler<{}, {}, IArticle> = async (req, res) => {
  try {
    const { body } = req;
    const requiredFields = ['companyId', 'dateWritten', 'bannerImageUrl', 'introParagraph', 'theGood', 'theBad'];

    const { isValid, missingFields } = verifyRequiredFields(requiredFields, body);
    if (!isValid) {
      output.error(req, res, new CustomError(`Invalid input. Body requires the following fields: ${missingFields.join(', ')}.`, ErrorTypes.INVALID_ARG));
      return;
    }
    const { companyId, dateWritten, bannerImageUrl, introParagraph, theGood, theBad } = body;
    const result = await ArticleService.createArticle(req, { companyId, dateWritten, bannerImageUrl, introParagraph, theGood, theBad });
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
