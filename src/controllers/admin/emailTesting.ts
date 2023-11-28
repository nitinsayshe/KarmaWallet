import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as EmailService from '../../services/email';
import { asCustomError } from '../../lib/customError';

export const testCashbackPayoutEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailService.testCashbackPayoutEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testACHInitiationEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailService.testACHInitiationEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testNoChargebackRightsEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailService.testNoChargebackRightsEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testKarmaCardWelcomeEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailService.testKarmaCardWelcomeEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testChangePasswordEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailService.testChangePasswordEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const testBankLinkedConfirmationEmail: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const email = await EmailService.testBankLinkedConfirmationEmail(req);
    output.api(req, res, email);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
