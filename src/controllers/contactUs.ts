import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as output from '../services/output';
import * as ContactUsService from '../services/contactUs';

export const submitContactUsEmail: IRequestHandler<{}, {}, ContactUsService.ISubmitContactUsEmailRequest> = async (req, res) => {
  try {
    const response = await ContactUsService.submitContactUsEmail(req);
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
