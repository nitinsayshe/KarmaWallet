import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { CompanyModel, ICompanyDocument, ICompanySector } from '../../models/company';
import { IPlaidCategoriesToSectorMappingDocument, PlaidCategoriesToSectorMappingModel } from '../../models/plaidCategoriesToKarmaSectorMapping';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';

export const mapSectorsToTransactions = async () => {
  console.log('\nmapping sectors to transactions...');

  let users: IUserDocument[];
  let sectorMappings: IPlaidCategoriesToSectorMappingDocument[];

  try {
    // using users for batching transactions.
    users = await UserModel.find({});
    sectorMappings = await PlaidCategoriesToSectorMappingModel
      .find({})
      .populate({
        path: 'sector',
        model: SectorModel,
      });

    if (!users.length) throw new CustomError('Failed to load users.', ErrorTypes.SERVER);
    if (!sectorMappings.length) throw new CustomError('Failed to load plaid category to sector mappings.');
  } catch (err) {
    console.log(err);
  }

  if (!users.length || !sectorMappings.length) return;

  let count = 0;
  let failedCount = 0;

  for (const user of users) {
    try {
      const transactions = await TransactionModel
        .find({ user })
        .populate([
          {
            path: 'company',
            model: CompanyModel,
          },
        ]);

      for (const transaction of transactions) {
        if (transaction.integrations?.rare) {
          const sectorMapping = sectorMappings.find(sm => (sm.sector as ISectorDocument)._id.toString() === '62192ef2f022c9e3fbff0b52' || (sm.sector as ISectorDocument)._id.toString() === '621b9adb5f87e75f53666fde');

          if (!sectorMapping) {
            failedCount += 1;
            console.log('[-] failed to find sector for rare transaction');
            continue;
          }

          transaction.sector = sectorMapping.sector as ISectorDocument;
          await transaction.save();
          count += 1;
        } else if (transaction.integrations?.plaid) {
          try {
            // TODO: get sector from transaction
            // if has company, use company's primary sector
            // else find sector based on plaid category mapping
            if (!!(transaction.company as ICompanyDocument)?.sectors?.length) {
              const primarySector = (transaction.company as ICompanyDocument).sectors.find(s => s.primary);
              if (!primarySector) {
                console.log(transaction.company);
                console.log(primarySector);
                throw new CustomError('Failed to find primary sector for company:', (transaction.company as ICompanyDocument).companyName);
              }

              transaction.sector = ((primarySector as ICompanySector).sector as ISectorDocument);
            } else {
              let plaidCategoriesId: string;
              if (transaction.integrations?.plaid?.category) {
                plaidCategoriesId = transaction.integrations.plaid.category.map(x => x.trim().split(' ').join('-')).filter(x => !!x).join('-');
              }

              if (!!plaidCategoriesId) {
                transaction.sector = sectorMappings.find(pcm => pcm.plaidCategoriesId === plaidCategoriesId)?.sector as ISectorDocument;
              }
            }

            if (!transaction.sector) {
              console.log('[-] failed to map transaction: ', transaction._id);
              failedCount += 1;
              continue;
            }

            await transaction.save();
            count += 1;
          } catch (err) {
            console.log(err);
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  const msg = failedCount > 0
    ? `Sectors mapped to ${count} transactions but with ${failedCount} transactions unmapped.`
    : `Sectors mapped to ${count} transactions successfully.`;

  console.log(`[+] ${msg}\n`);
};
