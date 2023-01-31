import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as CommissionService from '../../services/commission';
import * as output from '../../services/output';

export const getCommissionsForAllUsers: IRequestHandler< { type: CommissionService.CommissionType }> = async (req, res) => {
  try {
    const commissions = await CommissionService.getCommissionsForAllUsers(req);
    output.api(req, res, commissions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
