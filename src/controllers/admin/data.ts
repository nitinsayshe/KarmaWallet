import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as DataService from '../../services/data';

export const cleanCompany: IRequestHandler = async (req, res) => {
  const result = await DataService.cleanCompany(req);
  output.api(req, res, result);
};
