import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';

export const test: IRequestHandler = (req, res) => {
  output.api(req, res, { message: 'done' });
};
