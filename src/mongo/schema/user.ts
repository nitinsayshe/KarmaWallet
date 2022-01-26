import { Schema } from 'mongoose';
import { UserRoles } from '../../lib/constants';

export default {
  _id: { type: String },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  plaidItems: { type: [String], ref: 'plaidItem', default: [] },
  dateJoined: { type: Date, default: new Date() },
  zipcode: { type: String },
  subscribedUpdates: { type: Boolean, default: true },
  groups: [{
    group: {
      type: Schema.Types.ObjectId,
      ref: 'user_group',
    },
    role: { type: String },
  }],
  role: {
    type: String,
    default: 'none',
    enum: Object.values(UserRoles),
  },
  emailVerified: { type: Boolean, default: false },
  lastModified: { type: Date, default: new Date() },
  v2Id: { type: String },
  integrations: {
    rare: {
      type: {
        userId: { type: String },
      },
    },
  },
};
