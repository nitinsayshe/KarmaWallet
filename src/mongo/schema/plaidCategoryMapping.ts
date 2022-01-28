export default {
  plaidCategoriesId: {
    type: String,
    unique: true,
    required: true,
  },
  plaid_categories: [{ type: String }],
  carbonMultiplier: {
    type: Number,
    required: true,
  },
  category: {
    type: Number,
  },
  subCategory: {
    type: Number,
  },
};
