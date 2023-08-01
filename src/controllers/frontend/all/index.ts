import { Response } from 'express';
import { sendDefaultHtml, sendIndex } from '../../../services/frontend_output';
import { IRequest } from '../../../types/request';

export const sendAll = (req: IRequest, res: Response) => {
  try {
    sendDefaultHtml(req, res);
  } catch (e) {
    return sendIndex(req, res);
  }
};
