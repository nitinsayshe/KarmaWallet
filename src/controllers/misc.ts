import * as MiscService from '../services/misc';
import { api } from '../services/output';
import { IRequestHandler } from '../types/request';

export const getAppVersion: IRequestHandler = async (req, res) => {
  try {
    const result = await MiscService.getCurrentAppVersion();
    api(req, res, result);
  } catch (err) {
    api(req, res, err);
  }
};
