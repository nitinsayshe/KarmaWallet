import { MerchantRateModel } from '../../models/merchantRate';
import { IMerchantDocument, MerchantModel } from '../../models/merchant';
import { WildfireClient } from '../../clients/wildfire';

export const updateWildfireMerchantRates = async () => {
  const wildfireClient = new WildfireClient();
  const merchants: IMerchantDocument[] = await MerchantModel.find({});
  const res = await wildfireClient.getMerchantRates();
  const newRates: {[key: string]: any[]} = res.data;
  // caching date for cleanup purposes
  const lastModifiedDate = new Date().toISOString();
  let count = 0;

  for (const merchant of merchants) {
    const { merchantId } = merchant.integrations.wildfire;
    const newRatesForMerchant = newRates[merchantId.toString()];

    if (newRatesForMerchant) {
      try {
        for (const rate of newRatesForMerchant) {
          const merchantRate = await MerchantRateModel.create(
            {
              merchant: merchant._id,
              integrations: {
                wildfire: {
                  merchantId,
                  ID: rate.ID,
                  Name: rate.Name,
                  Kind: rate.Kind,
                  Amount: parseFloat(rate.Amount),
                  Currency: rate.Currency,
                },
              },
              lastModified: lastModifiedDate,
            },
          );

          if (merchantRate) count += 1;
        }
      } catch (err: any) {
        await MerchantRateModel.deleteMany({
          'integrations.wildfire.merchantId': merchantId,
          lastModified: lastModifiedDate,
        });

        console.log('Error updating merchant rates for merchant', merchantId, err);
        return;
      }
      // iterate over newRatesForMerchant and upsert a new merchantRate in the merchantRates collection (create it if it does not exist, if it does exist update i)
    }

    // after the newMerchantsRate loop, delete all the merchantRates last modified before the current date
    await MerchantRateModel.deleteMany({
      'integrations.wildfire.merchantId': merchantId,
      lastModified: { $lt: lastModifiedDate },
    });
  }

  console.log('//////////// RATES UPSERTED', count);
};
