import { Schema } from 'mongoose';
import { TokenTypes } from '../../lib/constants';

export default {
  type: { type: String, required: true, enum: Object.values(TokenTypes) },
  value: { type: String, required: true },
  createdOn: { type: Date, default: new Date() },
  expires: { type: Date, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  consumed: { type: Boolean, default: false },
};
