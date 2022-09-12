/* eslint-disable camelcase */
import { updateWildfireMerchants } from '../services/scripts/update_wildfire_merchants';
import { updateWildfireMerchantRates } from '../services/scripts/update_wildfire_rates';

/**
 * pulls wildfire data and updates the database
 */

export const exec = async () => {
  await updateWildfireMerchants();
  await updateWildfireMerchantRates();
  console.log('////////// Updated Wildfire Data //////////');
};
