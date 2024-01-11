import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as FAQsService from '../services/faqs';

export const getFAQs: IRequestHandler = async (req, res) => {
  try {
    const faqs = await FAQsService.getFAQs(req);
    api(req, res, faqs);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
