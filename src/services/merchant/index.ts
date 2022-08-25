import { IMerchantDocument, IShareableMerchant } from '../../models/merchant';

export const getShareableMerchant = ({
  _id,
  name,
  integrations,
}: IMerchantDocument): IShareableMerchant => ({
  _id,
  name,
  integrations,
});
