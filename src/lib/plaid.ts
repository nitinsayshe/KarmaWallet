// takes all the plaid categories and converts them into
// a single id to be used in plaid categories to sector
// mapping.
export const getPlaidCategoriesId = (plaidCategories: string[]) => plaidCategories.map(x => x.trim().split(' ').join('-')).filter(x => !!x).join('-');
