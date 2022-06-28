import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';

export const updateTransactionSectors = async () => {
  console.log('\nupdating transaction sectors...\n');

  let users: IUserDocument[];

  try {
    users = await UserModel.find({});
  } catch (err) {
    console.log('[-] error finding users', err);
  }

  if (!users?.length) return;

  let count = 0;

  for (const user of users) {
    let transactions: ITransactionDocument[];

    try {
      transactions = await TransactionModel
        .find({ user: user._id })
        .populate({
          path: 'company',
          model: CompanyModel,
          populate: {
            path: 'sectors.sector',
            model: SectorModel,
          },
        });
    } catch (err) {
      console.log('[-] error finding transactions for user: ', user._id, err, '\n');
    }

    if (!transactions?.length) continue;

    for (const transaction of transactions) {
      if (!transaction.company) continue;

      const sector = (transaction.company as ICompanyDocument).sectors.find(s => s.primary)?.sector;

      if (!sector) continue;

      if ((sector as ISectorDocument)._id.toString() !== transaction.sector.toString()) {
        transaction.sector = (sector as ISectorDocument)._id;
        await transaction.save();
        count += 1;
      }
    }
  }

  console.log(`[+] ${count} transactions updated\n`);
};
