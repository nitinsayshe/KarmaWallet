import dayjs from 'dayjs';
import { ChargebackTransition } from '../../integrations/marqeta/types';
import { ChargebackTypeEnum } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { saveDocuments } from '../../lib/model';
import { IChargebackDocument, ChargebackModel } from '../../models/chargeback';
import { createCaseWonProvisionalCreditNotAlreadyIssuedUserNotification, createNoChargebackRightsUserNotification, createProvisionalCreditPermanentNotification } from '../user_notification';
import { TransactionModel } from '../../models/transaction';
import { TransactionModelTypeEnum, TransactionModelTypeEnumValues } from '../../clients/marqeta/types';

export const getExistingTransactionFromChargeback = async (c: IChargebackDocument) => {
  const existingTransaction = await TransactionModel.findOne({
    $or: [
      { $and: [{ 'integrations.marqeta.token': { $exists: true } }, { 'integrations.marqeta.token': c.integrations.marqeta.transaction_token }] },
      {
        $and: [
          { 'integrations.marqeta.relatedTransactions.token': { $exists: true } },
          { 'integrations.marqeta.relatedTransactions.token': c.integrations.marqeta.transaction_token },
        ],
      },
    ],
  });

  if (!!existingTransaction) return existingTransaction;
  return null;
};

export const createChargeback = async (chargeback: Partial<IChargebackDocument>): Promise<IChargebackDocument> => {
  try {
    const token = chargeback?.integrations?.marqeta?.token;
    if (!token) throw new CustomError(`Chargeback token is required in the provided chargeback: ${JSON.stringify(chargeback)}`);
    const existingChargeback = await ChargebackModel.findOne({ token });

    if (!!existingChargeback?.id) throw new CustomError(`Chargeback with token ${token} already exists`);
    const createdChargeback = new ChargebackModel(chargeback);
    return createdChargeback.save();
  } catch (err) {
    console.log(err);
    if (!!(err as CustomError)?.isCustomError) throw err;
    throw new Error('Error creating chargeback');
  }
};

export const updateChargeback = async (chargeback: Partial<IChargebackDocument>): Promise<IChargebackDocument> => {
  try {
    const token = chargeback?.integrations?.marqeta?.token;
    if (!token) throw new CustomError(`Chargeback token is required in the provided chargeback: ${JSON.stringify(chargeback)}`);
    const existingChargeback = await ChargebackModel.findOne({ token });

    if (!existingChargeback?.id) throw new CustomError(`Chargeback with token ${token} does not exist`);
    existingChargeback.set(chargeback);

    return chargeback.save();
  } catch (err) {
    console.log(err);
    if (!!(err as CustomError)?.isCustomError) throw err;
    throw new Error('Error updating chargeback');
  }
};

const getExistingChargebackFromToken = async (
  token: string,
  procesingChargebacks: IChargebackDocument[] = [],
): Promise<IChargebackDocument | null> => {
  // see if we're pocessing it right now
  // it would have to be already mapped to a kw chargeback at this point.
  const existingProcessingChargebacks = procesingChargebacks.find((c) => c?.integrations?.marqeta?.token === token);
  if (!!existingProcessingChargebacks) {
    console.log(`Found existing processing chargeback with token in procesingChargebacks: ${token}`);
    return existingProcessingChargebacks;
  }
  try {
    const existingChargeback = await ChargebackModel.findOne({
      token,
    });
    if (!existingChargeback?._id) {
      throw Error(`No chargeback found with token: ${token}`);
    }
    console.log(`Found existing processing chargeback with token in db: ${existingChargeback}`);
    return existingChargeback;
  } catch (err) {
    console.log(`Error looking up chargeback with marqeta token: ${token}, ${err}`);
    return null;
  }
};

const getChargebackFromMarqetaChargebackTransition = (c: ChargebackTransition): Partial<IChargebackDocument> => ({
  integrations: {
    marqeta: {
      token: c?.chargeback_token,
      state: c?.state,
      previous_state: c?.previous_state,
      channel: c?.channel,
      type: c?.type,
      reason: c?.reason,
      transaction_token: c?.transaction_token,
      created_time: c?.created_time,
      last_modified_time: c?.last_modified_time,
    },
  },
});

const getNewOrUpdatedChargebackFromChargebackTransition = async (
  c: ChargebackTransition,
  processingChargebacks: IChargebackDocument[] = [],
): Promise<IChargebackDocument> => {
  // check if this transaction already exists in the db
  const chargeback = getChargebackFromMarqetaChargebackTransition(c);
  if (!c?.chargeback_token) {
    throw new CustomError(`Chargeback token is required in the provided chargeback transition: ${JSON.stringify(c)}`);
  }
  const existingChargeback = await getExistingChargebackFromToken(c?.chargeback_token, processingChargebacks);
  if (!!existingChargeback) {
    existingChargeback.integrations.marqeta.state = c.state;
    existingChargeback.lastModified = getUtcDate().toDate();
    existingChargeback.integrations.marqeta.relatedChargebacks = !!existingChargeback.integrations.marqeta.relatedChargebacks
      ? [...existingChargeback.integrations.marqeta.relatedChargebacks, chargeback.integrations.marqeta]
      : [chargeback.integrations.marqeta];
    return existingChargeback;
  }

  const newChargeback = new ChargebackModel(chargeback);
  return newChargeback;
};

export const mapChargebackTransitionToChargeback = async (
  marqetaChargebackTransitions: ChargebackTransition[],
): Promise<IChargebackDocument[]> => {
  // sort these items so they are processed in order
  marqetaChargebackTransitions.sort((a, b) => {
    if (dayjs(a.created_time).isBefore(dayjs(b.created_time))) {
      return 1;
    }
    if (dayjs(a.created_time).isAfter(dayjs(b.created_time))) {
      return -1;
    }
    return 0;
  });

  const updatedOrNewChargebacks: IChargebackDocument[] = [];
  for (let i = 0; i < marqetaChargebackTransitions.length; i++) {
    try {
      const updatedChargebacks = await getNewOrUpdatedChargebackFromChargebackTransition(
        marqetaChargebackTransitions[i],
        updatedOrNewChargebacks,
      );
      if (!!updatedChargebacks) {
        if (!updatedOrNewChargebacks.find((t) => t._id.toString() === updatedChargebacks._id.toString())) {
          updatedOrNewChargebacks.push(updatedChargebacks);
        } else {
          updatedOrNewChargebacks.map((t) => {
            if (t._id.toString() === updatedChargebacks._id.toString()) {
              return updatedChargebacks;
            }
            return t;
          });
        }
      }
    } catch (err) {
      console.error(`Error mapping marqeta chargeback to karma chargeback: ${JSON.stringify(marqetaChargebackTransitions[i])}`);
      console.error(err);
    }
  }
  return updatedOrNewChargebacks;
};

export const mapAndSaveMarqetaChargebackTransitionsToChargebacks = async (
  chargebackTransitions: ChargebackTransition[],
): Promise<IChargebackDocument[]> => {
  const chargebacksToSave = await mapChargebackTransitionToChargeback(chargebackTransitions);
  return saveDocuments(chargebacksToSave) as unknown as IChargebackDocument[];
};

const handleRegulationProvisionalCreditPermanent = async (
  chargebackTransition: IChargebackDocument,
): Promise<void> => {
  if (chargebackTransition.integrations.marqeta.type !== 'regulation.provisional.credit.permanent') {
    return;
  }
  await createProvisionalCreditPermanentNotification(chargebackTransition);
};

export const creditIssued = async (type: TransactionModelTypeEnumValues) => type === TransactionModelTypeEnum.AuthorizationClearingChargebackCompleted || type === TransactionModelTypeEnum.PindebitChargebackCompleted;

export const checkIfProvisionalCreditAlreadyApplied = async (c: IChargebackDocument) => {
  const existingTransaction = await getExistingTransactionFromChargeback(c);
  if (!existingTransaction) {
    return false;
  }

  if (!!existingTransaction) {
    const { relatedTransactions } = existingTransaction.integrations.marqeta;
    if (!!creditIssued(existingTransaction.integrations.marqeta.type)) return true;
    for (const rt of relatedTransactions) {
      if (!!creditIssued(rt.type)) {
        console.log(`Found existing provisional credit issued transaction with token: ${rt.token}`);
        return true;
      }
    }

    return false;
  }
};

export const checkIfShouldSendCaseWonProvisionalCreditNotAlreadyIssuedEmail = async (
  chargebackTransition: IChargebackDocument,
): Promise<void> => {
  if (chargebackTransition.integrations.marqeta.type !== 'case.won') {
    return;
  }
  const shouldSendEmail = await checkIfProvisionalCreditAlreadyApplied(chargebackTransition);
  if (!!shouldSendEmail) {
    await createCaseWonProvisionalCreditNotAlreadyIssuedUserNotification(chargebackTransition);
  }
};

// This is a placeholder for adding logic that handles the dispute macros
export const handleDisputeMacros = async (chargebackTransitions: IChargebackDocument[]): Promise<void> => {
  await Promise.all(
    chargebackTransitions.map(async (c) => {
      try {
        switch (c?.integrations?.marqeta?.type) {
          case ChargebackTypeEnum.INITIATED:
            break;
          case ChargebackTypeEnum.REPRESENTMENT:
            break;
          case ChargebackTypeEnum.PREARBITRATION:
            break;
          case ChargebackTypeEnum.PREARBITRATION_RESPONDED:
            break;
          case ChargebackTypeEnum.ARBITRATION:
            break;
          case ChargebackTypeEnum.CASE_WON || ChargebackTypeEnum.REGULATION_CASE_WON:
            await checkIfShouldSendCaseWonProvisionalCreditNotAlreadyIssuedEmail(c);
            break;
          case ChargebackTypeEnum.CASE_LOST:
            break;
          case ChargebackTypeEnum.NETWORK_REJECTED:
            await createNoChargebackRightsUserNotification(c);
            break;
          case ChargebackTypeEnum.WRITTEN_OFF_ISSUER:
            break;
          case ChargebackTypeEnum.WRITTEN_OFF_PROGRAM:
            break;
          case ChargebackTypeEnum.REGULATION_PROVISIONAL_CREDIT_PERMANENT || ChargebackTypeEnum.PROVISIONAL_CREDIT_PERMANENT:
            await handleRegulationProvisionalCreditPermanent(c);
            break;
          case ChargebackTypeEnum.REGULATION_CASE_LOST_ACTION_REQUIRED:
            break;
          case ChargebackTypeEnum.CASE_LOST_ACTION_REQUIRED:
            break;
          default:
            console.log(`No notification created for chargeback transition with type: ${c?.integrations?.marqeta?.type}`);
        }
      } catch (err) {
        console.error(`Error creating notification from chargeback transition: ${JSON.stringify(c)}`);
        console.error(err);
        return null;
      }
    }),
  );
};
