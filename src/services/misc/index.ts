import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { MiscModel } from '../../models/misc';

export const getCompanyRatingsThresholds = async () => {
  const _companyRatingsThresholds = await MiscModel.findOne({ key: 'company-ratings-thresholds' });
  if (!_companyRatingsThresholds?.value) throw new CustomError('Company ratings thresholds not found', ErrorTypes.NOT_FOUND);
  return JSON.parse(_companyRatingsThresholds?.value);
};

export const getRareProjectAverage = async () => {
  const rareProjectAverage = await MiscModel.findOne({ key: 'rare-project-average' });
  if (!rareProjectAverage) throw new CustomError('No rare project average found.', ErrorTypes.INVALID_ARG);
  return parseFloat(rareProjectAverage.value);
};
