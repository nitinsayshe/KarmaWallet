import { IRequestHandler } from '../../types/request';
import * as output from '../../services/output';
import * as CompanyService from '../../services/company';
import { asCustomError } from '../../lib/customError';
import { BatchCSVUploadType, uploadBatchCsv } from '../../services/upload';

export const createBatchedCompanies: IRequestHandler = async (req, res) => {
  try {
    const uploadResult = await uploadBatchCsv(req, BatchCSVUploadType.Companies);
    const result = await CompanyService.createBatchedCompanies({ ...req, body: { fileUrl: uploadResult.url } });
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateCompany: IRequestHandler<CompanyService.ICompanyRequestParams, {}, CompanyService.IUpdateCompanyRequestBody> = async (req, res) => {
  try {
    const company = await CompanyService.updateCompany(req);
    output.api(req, res, CompanyService.getShareableCompany(company));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const updateBatchedCompaniesParentChildRelationships: IRequestHandler = async (req, res) => {
  try {
    const uploadResult = await uploadBatchCsv(req, BatchCSVUploadType.CompaniesParentChildRelationships);
    const result = await CompanyService.updateBatchedCompaniesParentChildRelationships({ ...req, body: { fileUrl: uploadResult.url } });
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
