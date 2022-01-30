import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';

export const getUsers: IRequestHandler = (req, res) => {
  output.api(req, res, { message: 'you got the users' });
};
