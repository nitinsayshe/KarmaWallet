import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as CompanyService from '../../services/company';
import { asCustomError } from '../../lib/customError';

export const updateCompany: IRequestHandler<CompanyService.ICompanyRequestParams, {}, CompanyService.IUpdateCompanyRequestBody> = async (req, res) => {
  try {
    const company = await CompanyService.updateCompany(req);
    output.api(req, res, CompanyService.getShareableCompany(company));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
