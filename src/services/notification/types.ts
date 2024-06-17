import { IUserDocument } from '../../models/user';
import { IVisitorDocument } from '../../models/visitor';

export interface IResumeKarmaCardEmailData {
  link: string;
  recipientEmail: string;
  applicationExpirationDate: string;
  name: string;
  user?: IUserDocument;
  visitor?: IVisitorDocument;
}

export interface IEffectFunctionParams {
  user?: IUserDocument;
  visitor?: IVisitorDocument;
  data: any;
}
