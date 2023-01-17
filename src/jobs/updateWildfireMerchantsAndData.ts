/* eslint-disable camelcase */
import { updateWildfireMerchants, updateWildfireMerchantRates } from '../services/scripts/wildfire';

/**
 * pulls wildfire data and updates the database
 */

export const exec = async () => {
  await updateWildfireMerchants();
  await updateWildfireMerchantRates();
  console.log('[+] wildfire data updated');
};
