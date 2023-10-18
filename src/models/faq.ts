import {
  Schema,
  model,
  Document,
  Model,
  ObjectId,
} from 'mongoose';
import { IModel } from '../types/model';
import { getUtcDate } from '../lib/date';

export enum FAQLocation {
  cardApplication = 'cardApplication',
  webApplication = 'webApplication',
}

export enum FAQSubject {
  cashbackOffers = 'Cashback',
  karmaWalletCard = 'Karma Wallet Card',
  carbonEmissions = 'Calculating Carbon Emissions',
  accountQuestions = 'Karma Wallet Account Question',
  calculatingImpact = 'Calculating Impact',
  securityPrivacy = 'Security & Privacy',
  other = 'Other Questions',
}

export interface IFAQ {
  _id: ObjectId;
  createdOn: Date;
  lasModified: Date;
  question: string;
  answer: string;
  location: FAQLocation[];
  subject: FAQSubject;
}

export interface IFAQDocument extends Document {
}

export type IFAQModel = IModel<IFAQ>;

const faqSchema = new Schema({
  createdOn: { type: Date, default: () => getUtcDate().toDate() },
  lastModified: { type: Date, default: () => getUtcDate().toDate() },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  location: { type: [String], enum: Object.values(FAQLocation), required: true },
  subject: { type: String, required: true },
});

export const FAQModel = model<IFAQDocument, Model<IFAQ>>('faq', faqSchema);
