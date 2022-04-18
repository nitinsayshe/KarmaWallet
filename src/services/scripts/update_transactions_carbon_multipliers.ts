import path from 'path';
import csvtojson from 'csvtojson';
import { PlaidCategoryMappingModel } from '../../models/plaidCategoryMapping';
import { TransactionModel } from '../../models/transaction';
// import PlaidItemModel from '../../mongo/model/plaidItem';
import { asCustomError } from '../../lib/customError';

const readNewPlaidCategories = async () => {
  try {
    return await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'old_plaid_category_mappings.csv'));
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updatePlaidCategoriesMappingCarbonMultipliers = async () => {
  try {
    console.log('\nupdating plaid categories with new multipliers...');
    const plaidCategoryMappings = await PlaidCategoryMappingModel.find();
    const newPlaidCategories = await readNewPlaidCategories();
    const notUpdated = [];
    let updatedCount = 0;

    for (const newPlaidCategory of newPlaidCategories) {
      const plaidCategory = plaidCategoryMappings.find(pc => pc.plaidCategoriesId === newPlaidCategory.plaidCategoriesId);
      if (!!plaidCategory) {
        plaidCategory.carbonMultiplier = newPlaidCategory.carbonMultiplier;
        await plaidCategory.save();
        updatedCount += 1;
      } else {
        notUpdated.push({ newPlaidCategory });
      }
    }

    console.log(`[+] ${updatedCount}/${newPlaidCategories.length} plaid categories updated with new multipliers\n`);
    if (notUpdated.length) {
      console.log('[-] the following plaid categories were not found in the db');
      console.log(notUpdated);
    }
  } catch (err) {
    console.log(err);
    throw asCustomError(err);
  }
};

export const updateAllTransactionsWithUpdatedCarbonMultipliers = async () => {
  try {
    // await readPlaidItemTransactionCategories();

    await updatePlaidCategoriesMappingCarbonMultipliers();

    console.log('\nupdating transactions with updated carbon multipliers...');

    const plaidCategoryMappings = await PlaidCategoryMappingModel.find();
    const transactions = await TransactionModel.find();
    const notUpdated = [];
    let updatedCount = 0;

    for (const transaction of transactions) {
      let plaidCategoriesId;
      const plaidCategory = plaidCategoryMappings.find(pc => {
        if (!transaction.integrations?.plaid?.category?.length) return false;
        plaidCategoriesId = transaction.integrations.plaid.category.map(x => x.trim().split(' ').join('-')).filter(x => !!x).join('-');
        return pc.plaidCategoriesId === plaidCategoriesId;
      });

      if (!!plaidCategory) {
        transaction.carbonMultiplier = plaidCategory;
        await transaction.save();
        updatedCount += 1;
      } else {
        notUpdated.push({
          transactionId: transaction._id,
          categories: transaction.integrations.plaid.category,
          plaidCategoriesId,
        });
      }
    }

    console.log(`${updatedCount} transactions updated\n`);
    if (notUpdated.length) {
      console.log('[-] the following transactions could not be updated');
      console.log(notUpdated);
    }
  } catch (err) {
    console.log(err);
    throw asCustomError(err);
  }
};
