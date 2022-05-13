import { IRequestHandler } from '../../types/request';
import { RareClient } from '../../clients/rare';
import * as output from '../../services/output';
import { asCustomError } from '../../lib/customError';

export const getProjects: IRequestHandler = async (req, res) => {
  try {
    const client = new RareClient();
    const projects = await client.getProjects();
    output.api(req, res, projects);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
