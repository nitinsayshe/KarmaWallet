/* eslint-disable camelcase */
import CustomError from '../lib/customError';
import { ErrorTypes } from '../lib/constants';
import { RareClient } from '../clients/rare';
import { MiscModel } from '../models/misc';

/**
 * pulls the rare project average from the rare api and saves it to the misc collection
 */

export const exec = async () => {
  const client = new RareClient();
  const { bundle_cost_per_tonne: rareProjectAverage } = await client.getProjects();
  if (!rareProjectAverage) throw new CustomError('Rare project average not found', ErrorTypes.SERVICE);
  await MiscModel.findOneAndUpdate({ key: 'rare-project-average' }, { value: rareProjectAverage }, { upsert: true });
  return 'Rare project average successfully updated';
};
