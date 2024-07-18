import { IUserDocument } from '../user';

export interface ILowBalanceEvent {
  user: IUserDocument;
  createdDate: string;
  lastEmailSent: string;
}
