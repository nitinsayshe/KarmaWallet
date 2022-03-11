import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as GroupsService from '../../services/groups';
import { asCustomError } from '../../lib/customError';

export const getGroupsSummary: IRequestHandler = async (req, res) => {
  try {
    const summary = await GroupsService.getSummary(req);
    output.api(req, res, summary);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
