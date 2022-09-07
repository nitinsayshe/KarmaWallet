/* eslint-disable camelcase */
import { WildfireClient } from '../clients/wildfire';

/**
 * pulls wildfire data and updates the database
 */

export const exec = async () => {
  const client = new WildfireClient();
  const merchants = await client.getMerchants();
  console.log(merchants);
  return 'Wildfire merchants successfully updated';
};
