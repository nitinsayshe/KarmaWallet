import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  sendNoChargebackRightsEmail,
  sendKarmaCardWelcomeEmail,
  sendChangePasswordEmail,
  sendACHInitiationEmail,
  sendCashbackPayoutEmail,
  sendProvisionalCreditIssuedEmail,
  sendBankLinkedConfirmationEmail,
  sendCaseLostProvisionalCreditAlreadyIssuedEmail,
  sendCaseWonProvisionalCreditAlreadyIssuedEmail,
  sendCaseWonProvisionalCreditNotAlreadyIssuedEmail,
  sendCardShippedEmail,
} from '.';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';

dayjs.extend(utc);

export const testNoChargebackRightsEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const user = req.requestor;
    if (!user) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${user}.`, ErrorTypes.NOT_FOUND);

    const emailResponse = await sendNoChargebackRightsEmail({
      user: req.requestor,
      amount: '1032.00',
      companyName: 'Amazon Web Services',
      name: user.name,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testKarmaCardWelcomeEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);

    const emailResponse = await sendKarmaCardWelcomeEmail({
      user: user._id,
      name: user.name,
      newUser: true, // toggle to send corresponding email
      recipientEmail: email,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testChangePasswordEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const user = req.requestor;
    if (!user) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${user}.`, ErrorTypes.NOT_FOUND);

    const emailResponse = await sendChangePasswordEmail({
      user: req.requestor._id,
      recipientEmail: email,
      name: user.name,
      token: '1234',
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testACHInitiationEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const user = req.requestor;
    if (!user) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${user}.`, ErrorTypes.NOT_FOUND);

    const emailResponse = await sendACHInitiationEmail({
      user: req.requestor,
      amount: '100.00',
      accountMask: '1234',
      accountType: 'Checking',
      date: '12/14/2023',
      name: user.name,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testCashbackPayoutEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);
    const emailResponse = await sendCashbackPayoutEmail({
      user: user._id,
      recipientEmail: email,
      name: user.name,
      amount: '10.44',
    });
    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testProvisionalCreditIssuedEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);
    const emailResponse = await sendProvisionalCreditIssuedEmail({
      user: req.requestor,
      name: user.name,
      amount: '10.44',
      date: '12/14/2023',
    });
    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testBankLinkedConfirmationEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const user = req.requestor;
    if (!user) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${user}.`, ErrorTypes.NOT_FOUND);
    if (!user?.name) throw new CustomError(`No name found for user ${user}.`, ErrorTypes.NOT_FOUND);
    const instituteName = 'Test Bank';
    const lastDigitsOfBankAccountNumber = '5555';
    const emailResponse = await sendBankLinkedConfirmationEmail({
      user: req.requestor._id,
      recipientEmail: email,
      instituteName,
      lastDigitsOfBankAccountNumber,
      name: user?.name,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testCaseLostProvisionalCreditIssuedEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);
    const date = dayjs().format('MM/DD/YYYY');
    const date5DaysInFuture = dayjs().add(5, 'day').format('MM/DD/YYYY');

    const emailResponse = await sendCaseLostProvisionalCreditAlreadyIssuedEmail({
      user: req.requestor,
      name: user.name,
      companyName: 'Nike',
      amount: '138.53',
      date,
      reversalDate: date5DaysInFuture,
      reason: 'Product not received',
      recipientEmail: email,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testCaseWonProvisionalCreditAlreadyIssuedEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find((e) => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);

    const emailResponse = await sendCaseWonProvisionalCreditAlreadyIssuedEmail({
      user: _id,
      name: user.name,
      companyName: 'Nike',
      amount: '138.53',
      merchantName: 'Nike',
      submittedClaimDate: '12/03/23',
      recipientEmail: email,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testCaseWonProvisionalCreditNotAlreadyIssuedEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find(e => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);

    const emailResponse = await sendCaseWonProvisionalCreditNotAlreadyIssuedEmail({
      user: _id,
      name: user.name,
      companyName: 'Nike',
      amount: '138.53',
      date: '12/03/23',
      recipientEmail: email,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

export const testCardShippedEmail = async (req: IRequest<{}, {}, {}>) => {
  try {
    const { _id } = req.requestor;
    if (!_id) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
    const user = await UserModel.findById(_id);
    if (!user) throw new CustomError(`No user with id ${_id} was found.`, ErrorTypes.NOT_FOUND);
    const { email } = user.emails.find(e => !!e.primary);
    if (!email) throw new CustomError(`No primary email found for user ${_id}.`, ErrorTypes.NOT_FOUND);
    const emailResponse = await sendCardShippedEmail({
      user: _id,
      name: user.name,
      recipientEmail: email,
    });

    if (!!emailResponse) {
      return 'Email sent successfully';
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
