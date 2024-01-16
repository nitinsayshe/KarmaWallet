import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as FAQService from '../../services/faqs';
import { asCustomError } from '../../lib/customError';

export const createFAQ: IRequestHandler<{}, {}, FAQService.ICreateFAQRequestBody> = async (req, res) => {
  try {
    const faq = await FAQService.createFAQ(req);
    output.api(req, res, faq);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateFAQ: IRequestHandler<FAQService.IGetFAQParams, {}, FAQService.ICreateFAQRequestBody> = async (req, res) => {
  try {
    const faq = await FAQService.updateFAQ(req);
    output.api(req, res, faq);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
