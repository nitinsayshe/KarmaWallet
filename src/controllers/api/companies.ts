import { asCustomError } from '../../lib/customError';
import * as output from '../../services/output';
import { IRequestHandler } from '../../types/request';
import * as CompanyService from '../../services/company';
import { IGetCompanyDataParams } from '../../services/company/types';

export const getCompanies: IRequestHandler<{}, IGetCompanyDataParams, {}> = async (req, res) => {
  try {
    const result = await CompanyService.getCompaniesUsingClientSettings(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
