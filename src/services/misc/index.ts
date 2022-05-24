import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { MiscModel } from '../../models/misc';

export const getCompanyRatingsThresholds = async () => {
  const _companyRatingsThresholds = await MiscModel.findOne({ key: 'company-ratings-thresholds' });
  if (!_companyRatingsThresholds) throw new CustomError('Company ratings thresholds not found', ErrorTypes.NOT_FOUND);
  return JSON.parse(_companyRatingsThresholds?.value);
};
