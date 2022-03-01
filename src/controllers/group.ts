import * as GroupService from '../services/groups';
import * as output from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';

export const getGroup: IRequestHandler<{ code: string }> = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await GroupService.getGroup(req, code);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
