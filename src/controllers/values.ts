import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as output from '../services/output';
import * as ValuesService from '../services/values';
import { IValueDocument } from '../models/value';

export const getCompanyValues: IRequestHandler<{}, ValuesService.IGetCompanyValuesRequestQuery> = async (req, res) => {
  try {
    const values = await ValuesService.getCompanyValues(req);
    output.api(req, res, values.map(value => ValuesService.getShareableCompanyValue(value as IValueDocument)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateCompanyValues: IRequestHandler<ValuesService.IUpdateCompanyValuesRequestParams, {}, ValuesService.IUpdateCompanyValuesRequestBody> = async (req, res) => {
  try {
    const values = await ValuesService.updateCompanyValues(req);
    output.api(req, res, values.map(value => ValuesService.getShareableCompanyValue(value as IValueDocument)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getValues: IRequestHandler = async (req, res) => {
  try {
    const result = await ValuesService.getValues();
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
