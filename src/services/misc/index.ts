import { MiscModel } from '../../models/misc';

export const getCompanyRatingsThresholds = async () => {
  const _companyRatingsThresholds = await MiscModel.findOne({ key: 'company-ratings-thresholds' });
  return JSON.parse(_companyRatingsThresholds?.value);
};
