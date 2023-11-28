import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as EmailTestingService from '../../services/email/test_emails';
import { asCustomError } from '../../lib/customError';

export const testCashbackPayoutEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testCashbackPayoutEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testACHInitiationEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testACHInitiationEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testNoChargebackRightsEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testNoChargebackRightsEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testKarmaCardWelcomeEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testKarmaCardWelcomeEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testChangePasswordEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testChangePasswordEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testProvisionalCreditIssuedEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testProvisionalCreditIssuedEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testBankLinkedConfirmationEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testBankLinkedConfirmationEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testCaseLostProvisionalCreditIssuedEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testCaseLostProvisionalCreditIssuedEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testCaseWonProvisionalCreditAlreadyIssuedEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testCaseWonProvisionalCreditAlreadyIssuedEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testCaseWonProvisionalCreditNotAlreadyIssuedEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testCaseWonProvisionalCreditNotAlreadyIssuedEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testDisputeReceivedNoProvisionalCreditIssuedEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailTestingService.testDisputeReceivedNoProvisionalCreditIssuedEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
