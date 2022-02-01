import { api } from '../services/output';
import { IRequestHandler } from '../types/request';

export const test: IRequestHandler = (req, res) => {
  const data = `Route for ${req.originalUrl} under development`;
  api(req, res, data);
};
