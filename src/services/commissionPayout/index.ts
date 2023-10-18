import {
  ICommissionPayoutDocument,
  CommissionPayoutModel,
  KarmaCommissionPayoutStatus,
} from '../../models/commissionPayout';
import { ICommissionDocument, CommissionModel } from '../../models/commissions';
import { IUserDocument } from '../../models/user';

export type CommissionWithUser = ICommissionDocument & { user: IUserDocument };
export type CommissionPayoutWithCommissionsAndUsers =
  | ICommissionPayoutDocument
  | {
    commissions: CommissionWithUser[];
  };

export const getPayoutsWithUsersOnCommissions = async (
  payouts?: ICommissionPayoutDocument[],
): Promise<CommissionPayoutWithCommissionsAndUsers[]> => {
  const pendingPayoutsWithCommissionsAndUsers = await Promise.all(
    payouts.map(async (payout): Promise<CommissionPayoutWithCommissionsAndUsers> => {
      const commissionsWithUsers: CommissionWithUser[] = (
        await Promise.all(
          payout.commissions.map(async (commission): Promise<CommissionWithUser> => {
            try {
              const commissionsWithUser = await CommissionModel.aggregate()
                .match({ _id: commission })
                .lookup({
                  from: 'users',
                  localField: 'user',
                  foreignField: '_id',
                  as: 'user',
                })
                .unwind({ path: '$user' });
              if (!commissionsWithUser?.length || commissionsWithUser.length === 0) {
                throw new Error(`Error looking up commission with id: ${commission}`);
              }
              return commissionsWithUser[0];
            } catch (err) {
              console.error('Error looking up commission with id: ', commission);
              return null;
            }
          }),
        )
      ).filter((commission) => !!commission);
      return { ...payout, commissions: commissionsWithUsers };
    }),
  );
  return pendingPayoutsWithCommissionsAndUsers;
};

export const getPendingPayoutsWithUsersOnCommissions = async (): Promise<CommissionPayoutWithCommissionsAndUsers[]> => {
  const pendingPayouts = await CommissionPayoutModel.find({
    status: KarmaCommissionPayoutStatus.Pending,
  });

  return getPayoutsWithUsersOnCommissions(pendingPayouts);
};

export const getPendingPayoutDisbursementBreakdown = (
  payoutsWithUsersOnCommissions: CommissionPayoutWithCommissionsAndUsers[],
): { paypal: number; marqeta: number; unknown: number; total: number } => payoutsWithUsersOnCommissions.reduce(
  (acc, payout) => {
    // go through the commissions on this payout and add up the total amounts
    const payoutTotals = (payout.commissions as CommissionWithUser[]).reduce(
      (totalsAcc, commission) => {
        if (!!commission?.user?.integrations?.marqeta?.userToken) {
          totalsAcc.marqeta += commission.allocation.user;
        } else if (!!commission?.user?.integrations?.paypal?.payerId) {
          totalsAcc.paypal += commission.allocation.user;
        } else {
          totalsAcc.unknown += commission.allocation.user;
        }
        totalsAcc.total += commission.allocation.user;
        return totalsAcc;
      },
      { paypal: 0, marqeta: 0, unknown: 0, total: 0 },
    );

    return {
      paypal: acc.paypal + payoutTotals.paypal,
      marqeta: acc.marqeta + payoutTotals.marqeta,
      unknown: acc.unknown + payoutTotals.unknown,
      total: acc.total + payoutTotals.total,
    };
  },
  {
    paypal: 0,
    marqeta: 0,
    unknown: 0,
    total: 0,
  },
);
