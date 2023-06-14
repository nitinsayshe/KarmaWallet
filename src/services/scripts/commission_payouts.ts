import path from 'path';
import fs from 'fs';
import { parse } from 'json2csv';
import { CommissionModel, KarmaCommissionStatus } from '../../models/commissions';
import { UserModel } from '../../models/user';
import { CommissionPayoutOverviewModel } from '../../models/commissionPayoutOverview';
import { CommissionPayoutModel, KarmaCommissionPayoutStatus } from '../../models/commissionPayout';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';
import { IAddKarmaCommissionToUserRequestParams, addCashbackToUser } from '../commission';
import { PromoModel } from '../../models/promo';
import { PaypalClient, ISendPayoutBatchItem, ISendPayoutBatchHeader } from '../../clients/paypal';
import { getUtcDate } from '../../lib/date';

export const generatePayoutSummaryForPeriod = async (min: number, endDate?: Date, startDate?: Date) => {
  if (!endDate) endDate = new Date();
  const dateQuery = !startDate ? { $lte: endDate } : { $gte: startDate, $lte: endDate };
  let payoutsTotal = 0;
  let karmaTotal = 0;
  let wildfireTotal = 0;
  const noLinkedPaypalEmails = [];
  const userTransactionTotals: any = [];

  const payouts = await CommissionModel.aggregate([
    {
      $match: {
        createdOn: dateQuery,
        status: {
          $in: [
            KarmaCommissionStatus.ReceivedFromVendor,
            KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
          ],
        },
      },
    },
  ]);

  for (const payout of payouts) {
    const user = await UserModel.findById(payout.user);
    if (!user) continue;
    const existingUserObject = userTransactionTotals.find((u: any) => u.userId.toString() === user._id.toString());

    if (!existingUserObject) {
      console.log('[+] there is not an existing user object');
      userTransactionTotals.push({
        userId: user._id.toString(),
        name: user.name,
        total: payout.allocation.user ? payout.allocation.user : 0,
        karmaCommissions: payout.integrations.karma ? payout.allocation.user : 0,
        wildfireCommissions: payout.integrations.wildfire ? payout.allocation.user : 0,
        hasPaypal: !!user.integrations?.paypal,
      });

      if (!user.integrations?.paypal) {
        noLinkedPaypalEmails.push({
          userId: user._id.toString(),
          name: user.name,
          email: user.emails.find((e: any) => e.primary)?.email,
        });
      }
    } else {
      existingUserObject.total += payout.allocation.user;
      existingUserObject.karmaCommissions += payout.integrations.karma ? payout.allocation.user : 0;
      existingUserObject.wildfireCommissions += payout.integrations.wildfire ? payout.allocation.user : 0;
    }
  }

  for (const user of userTransactionTotals) {
    if (user.total < min) userTransactionTotals.splice(userTransactionTotals.indexOf(user), 1);
  }

  const karmaPayouts = payouts.filter((p: any) => p.integrations.karma);
  const wildfirePayouts = payouts.filter((p: any) => p.integrations.wildfire);
  // const payoutsWithLinkedPaypal = payouts.filter((payout: any) => userTransactionTotals.find((p: any) => p.userId === payout.user));

  payoutsTotal = payouts.reduce((acc, cur) => acc + cur.allocation.user, 0);
  karmaTotal = karmaPayouts.reduce((acc, cur) => acc + cur.allocation.user, 0);
  wildfireTotal = wildfirePayouts.reduce((acc, cur) => acc + cur.allocation.user, 0);

  // const payoutsTotalWithPaypal = payoutsWithLinkedPaypal.reduce((acc, cur) => acc + cur.amount, 0);
  // const karmaWithPaypal = karmaPayouts.filter((p: any) => payoutsWithLinkedPaypal.find(pp => pp.userId === p.user)).reduce((acc, cur) => acc + cur.amount, 0);
  // const wildfireWithPaypal = wildfirePayouts.filter((p: any) => payoutsWithLinkedPaypal.find(pp => pp.userId === p.user)).reduce((acc, cur) => acc + cur.amount, 0);

  const payoutNumbers = {
    payoutsTotal,
    karmaTotal,
    wildfireTotal,
    // payoutsTotalWithPaypal,
    // karmaWithPaypal,
    // wildfireWithPaypal,
  };

  const _csv = parse(payoutNumbers);
  const _breakdowncsv = parse(userTransactionTotals);
  const _nopaypalcsv = parse(noLinkedPaypalEmails);

  fs.writeFileSync(path.join(__dirname, '.tmp', 'payouts.csv'), _csv);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'commissionsbreakdown.csv'), _breakdowncsv);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'nopaypal.csv'), _nopaypalcsv);
};

export const getAllWildfireTotalCommissions = async () => {
  const mappedPayouts: any = [];
  const payouts = await CommissionModel.find({ 'integrations.wildfire': { $exists: true } });

  for (const payout of payouts) {
    mappedPayouts.push({
      amount: payout.amount,
      date: payout.createdOn,
      status: payout.status,
      user: payout.user.toString(),
      merchant: payout.merchant.toString(),
    });
  }

  const _csv = parse(mappedPayouts);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'allWildfireCommissions.csv'), _csv);
};

export const getReadyWildfireCommissioins = async () => {
  const mappedPayouts: any = [];
  const payouts = await CommissionModel.aggregate([
    {
      $match: {
        status: {
          $in: [
            KarmaCommissionStatus.ReceivedFromVendor,
            KarmaCommissionStatus.ConfirmedAndAwaitingVendorPayment,
          ],
        },
        'integrations.wildfire': { $exists: true },
      },
    },
  ]);

  for (const payout of payouts) {
    mappedPayouts.push({
      amount: payout.amount,
      date: payout.createdOn,
      status: payout.status,
      user: payout.user.toString(),
      merchant: payout.merchant.toString(),
    });
  }

  const _csv = parse(mappedPayouts);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'allReadyWildfireCommissions.csv'), _csv);
};

export const getListOfEmailsThatReceivedCommissionPayout = async (commisionPayoutOverviewId: string) => {
  const commissionPayoutOverview = await CommissionPayoutOverviewModel.findOne({ _id: commisionPayoutOverviewId });
  const { commissionPayouts } = commissionPayoutOverview;
  const paidEmails = [];
  const failedEmails = [];

  for (const payout of commissionPayouts) {
    const payoutData = await CommissionPayoutModel.findOne({ _id: payout });
    const user = await UserModel.findById(payoutData.user);
    const userPrimaryEmail = user.emails.filter(e => !!e.primary)[0].email;
    if (payoutData.status === KarmaCommissionPayoutStatus.Paid) {
      paidEmails.push({
        email: userPrimaryEmail,
      });
    }

    if (payoutData.status === KarmaCommissionPayoutStatus.Failed) {
      failedEmails.push({
        email: userPrimaryEmail,
      });
    }
  }

  const _failedCsv = parse(failedEmails);
  const _paidCsv = parse(paidEmails);

  fs.writeFileSync(path.join(__dirname, '.tmp', 'failed.csv'), _failedCsv);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'paid.csv'), _paidCsv);
};

export const addKarmaCommissionToUser = async (user: string, promo: string) => {
  const promoItem = await PromoModel.findOne({ _id: promo });
  const userItem = await UserModel.findOne({ _id: user });
  if (!user) throw new CustomError('User not found', ErrorTypes.SERVICE);

  userItem.integrations.promos = [...(userItem.integrations.promos || []), promoItem];
  await userItem.save();

  const { APP_USER_ID } = process.env;
  if (!APP_USER_ID) throw new CustomError('AppUserId not found', ErrorTypes.SERVICE);
  const appUser = await UserModel.findOne({ _id: APP_USER_ID });
  if (!appUser) throw new CustomError('AppUser not found', ErrorTypes.SERVICE);
  const mockRequest = ({
    requestor: appUser,
    authKey: '',
    params: { userId: user, promo: promoItem },
  } as unknown as IRequest<IAddKarmaCommissionToUserRequestParams, {}, {}>);
  await addCashbackToUser(mockRequest);
};

export const fixStatusesOnFailedAndPaidCommissions = async () => {
  const payouts = await CommissionPayoutModel.find({ status: { $in: [KarmaCommissionPayoutStatus.Failed, KarmaCommissionPayoutStatus.Paid] } });
  let paidCount = 0;
  let failedCount = 0;

  console.log('//////// these are all the payouts', payouts);
  for (const payout of payouts) {
    for (const commission of payout.commissions) {
      const commissionModel = await CommissionModel.findById(commission);
      if (!commissionModel) continue;
      console.log('//////// this is the commission', commissionModel);
      if (payout.status === KarmaCommissionPayoutStatus.Failed) {
        console.log('///// should be marked failed');
        failedCount++;
        commissionModel.status = KarmaCommissionStatus.Failed;
      } else if (payout.status === KarmaCommissionPayoutStatus.Paid) {
        console.log('///// should be marked paid');
        paidCount++;
        commissionModel.status = KarmaCommissionStatus.PaidToUser;
      }
      await commissionModel.save();
    }
  }

  console.log('/////// Final Count', {
    paidCount,
    failedCount,
  });
};

export const getAllUsersWithoutVerifiedPaypal = async () => {
  const usersWithout = [];
  const usersWithoutVerifiedPaypal = await UserModel.find({ 'integrations.paypal.verified_account': false });
  for (const user of usersWithoutVerifiedPaypal) {
    usersWithout.push({
      email: user.emails.filter(e => !!e.primary)[0].email,
    });
  }
  const _csv = parse(usersWithout);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'no_verified_paypal.csv'), _csv);
};

export const sendOneOffPayout = async (commissionPayoutIds: string[]) => {
  try {
    let commissionPayoutAmount = 0;
    const correspondingCommissionPayoutOverivew = await CommissionPayoutOverviewModel.findOne({ commissionPayouts: commissionPayoutIds[0] });
    const paypalClient = await new PaypalClient();
    const paypalPrimaryBalance = await paypalClient.getPrimaryBalance();
    const paypalPrimaryBalanceAmount = paypalPrimaryBalance?.available_balance?.value || 0;

    let paypalFormattedPayouts: ISendPayoutBatchItem[] = [];

    const sendPayoutHeader: ISendPayoutBatchHeader = {
      sender_batch_header: {
        sender_batch_id: `${correspondingCommissionPayoutOverivew._id}-${getUtcDate().unix()}`,
        email_subject: 'You\'ve received a cashback payout from Karma Wallet!',
        email_message: 'You\'ve earned cashback from Karma Wallet. Great job!.',
      },
    };

    for (const payout of commissionPayoutIds) {
      const payoutData = await CommissionPayoutModel.findById(payout);

      if (!payoutData) {
        console.log('[+] Commission payout not found. Skipping payout.');
        throw new CustomError('Commission payout not found.', ErrorTypes.INVALID_ARG);
      }

      commissionPayoutAmount += payoutData.amount;

      const user = await UserModel.findById(payoutData.user);

      if (!user) {
        console.log('[+] User not found. Skipping payout.');
        throw new CustomError('User not found.', ErrorTypes.INVALID_ARG);
      }

      const { paypal } = user.integrations;

      if (!paypal) {
        console.log('[+] User does not have paypal integration. Skipping payout.');
        throw new CustomError('User does not have paypal integration.', ErrorTypes.INVALID_ARG);
      }

      if (!paypal.payerId) {
        console.log('[+] User does not have paypal payerId. Skipping payout.');
        throw new CustomError('User does not have paypal payerId.', ErrorTypes.INVALID_ARG);
      }

      paypalFormattedPayouts = [{
        recipient_type: 'PAYPAL_ID',
        amount: {
          value: payoutData.amount.toString(),
          currency: 'USD',
        },
        receiver: paypal.payerId,
        note: 'Ready to earn even more? Browse thousands of company ratings then shop sustainably to earn cashback on Karma Wallet.',
        sender_item_id: payoutData._id.toString(),
      }];
    }

    if (paypalPrimaryBalanceAmount < commissionPayoutAmount) {
      throw new CustomError(`[+] Insufficient funds in PayPal account for this commission payout overview. Available balance: ${paypalPrimaryBalanceAmount}, Commission payout amount: ${commissionPayoutAmount}`, ErrorTypes.GEN);
    }

    if (!paypalFormattedPayouts.length) console.log('[+] No valid payouts to send.');

    const paypalResponse = await paypalClient.sendPayout(sendPayoutHeader, paypalFormattedPayouts);
    console.log('[+] Paypal payout sent', paypalResponse);
  } catch (err: any) {
    throw new Error(err);
  }
};
