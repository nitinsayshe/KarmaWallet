import { SupportTicketModel } from '../../models/supportTicket';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';
import { sendSupportTicketEmailToSupport } from '../email';

export interface ISubmitSupportTicketRequest {
  message: string;
}

export const sendEmailToSupport = async (supportTicketId: string) => {
  const supportTicket = await SupportTicketModel.findById(supportTicketId);
  if (!supportTicket) throw new Error('Support ticket not found');
};

export const submitSupportTicket = async (req: IRequest<{}, {}, ISubmitSupportTicketRequest>) => {
  const { requestor } = req;
  const { message } = req.body;

  const userInfo = await UserModel.findById(requestor._id);

  if (!userInfo) throw new Error('User not found');
  if (!message) throw new Error('A message is required');

  // create a new supporticket
  const supportTicket = new SupportTicketModel({
    user: userInfo,
    message,
  });

  const savedSuccess = await supportTicket.save();
  if (!savedSuccess) throw new Error('Unable to save support ticket. Please email support@karmawallet.io');

  sendSupportTicketEmailToSupport({
    user: userInfo,
    message,
    supportTicketId: savedSuccess._id.toString(),
  });

  if (!!savedSuccess) {
    return 'Support ticket created successfully. Someone from the Karma Wallet team will be in touch with you shortly.';
  }
};
