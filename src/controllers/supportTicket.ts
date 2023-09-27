import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as output from '../services/output';
import * as SupportTicketService from '../services/supportTicket';

export const submitSupportTicket: IRequestHandler<{}, {}, SupportTicketService.ISubmitSupportTicketRequest> = async (req, res) => {
  try {
    const response = await SupportTicketService.submitSupportTicket(req);
    output.api(req, res, response);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
