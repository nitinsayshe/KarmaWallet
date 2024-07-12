import { Schema, model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { getUtcDate } from '../../lib/date';
import { ApplicationStatus, IKarmaCardApplicationDocument, IKarmaCardApplicationModel } from './types';

const karmaCardApplication = new Schema({
  userId: { type: String },
  visitorId: {
    type: Schema.Types.ObjectId,
    ref: 'visitor',
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String },
  birthDate: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  state: { type: String, required: true },
  userToken: { type: String },
  kycResult: {
    status: { type: String },
    codes: { type: Array },
  },
  status: { type: String, enum: Object.values(ApplicationStatus) },
  createdOn: { type: Date, default: () => getUtcDate() },
  expirationDate: { type: Date },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
});

karmaCardApplication.plugin(mongoosePaginate);
export const KarmaCardApplicationModel = model<IKarmaCardApplicationDocument, PaginateModel<IKarmaCardApplicationModel>>('karmaCardApplication', karmaCardApplication);
