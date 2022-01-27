import { UnsdgNames } from '../../lib/constants';

export default {
  name: {
    type: String,
    required: true,
    enum: Object.values(UnsdgNames),
  },
  index: {
    type: Number,
    required: true,
  },
  createdOn: { type: Date },
  lastModified: { type: Date },
};
