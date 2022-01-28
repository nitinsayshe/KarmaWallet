import { CardStatus } from '../../lib/constants';

export default {
  userId: {
    type: String,
    ref: 'user',
    required: true,
  },
  name: { type: String },
  mask: { type: String },
  type: { type: String },
  subtype: { type: String },
  status: {
    type: String,
    required: true,
    enum: Object.values(CardStatus),
  },
  institution: { type: String },
  integrations: {
    plaid: {
      type: {
        accessToken: { type: String },
        accountId: { type: String },
        items: [{ type: String }],
        publicToken: { type: String },
        linkSessionId: { type: String },
        institutionId: { type: String },
      },
    },
    rare: {
      type: {
        card_id: { type: String },
        card_type: { type: String },
        last_four: { type: String },
        expr_month: { type: Number },
        expr_year: { type: Number },
      },
    },
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
};
