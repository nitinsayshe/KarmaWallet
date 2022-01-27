import { Schema } from 'mongoose';

export default {
  name: {
    type: String,
    required: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg_category',
  },
  categoryIndex: {
    type: Number,
    required: true,
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
};
