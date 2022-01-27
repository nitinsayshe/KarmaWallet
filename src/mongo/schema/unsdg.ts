import { Schema } from 'mongoose';

export default {
  title: {
    type: String,
    required: true,
  },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: 'unsdg_subCategory',
  },
  subCategoryIndex: { type: Number },
  goalNum: { type: Number },
  img: { type: String },
  sourceUrl: { type: String },
  description: { type: String },
  subTitle: { type: String },
  howToAcquire: { type: String },
  createdOn: { type: Date },
  lastModified: { type: Date },
};
