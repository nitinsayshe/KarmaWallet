import {
  Schema,
  model,
  Model,
} from 'mongoose';
import { getUtcDate } from '../../lib/date';
import { IChangeEmailProcessStatus, IChangeEmailRequest, IChangeEmailRequestDocument, IChangeEmailVerificationStatus } from './types';

const changeEmailRequest = new Schema({
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  status: { type: String, enum: Object.values(IChangeEmailProcessStatus), default: IChangeEmailProcessStatus.INCOMPLETE },
  verified: { type: String, enum: Object.values(IChangeEmailVerificationStatus), default: IChangeEmailVerificationStatus.UNVERIFIED },
  currentEmail: { type: String },
  proposedEmail: { type: String, default: null },
  verificationToken: { type: Schema.Types.ObjectId, ref: 'token' },
  affirmationToken: { type: Schema.Types.ObjectId, ref: 'token', default: null },
});

export const ChangeEmailRequestModel = model<IChangeEmailRequestDocument, Model<IChangeEmailRequest>>('change_email_request', changeEmailRequest);
