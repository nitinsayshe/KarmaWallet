import aqp from 'api-query-params';
import { toUTC } from '../lib/date';
import { IRequestHandler } from '../types/request';
import * as CompanyService from '../services/company';
import * as output from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import { ErrorTypes } from '../lib/constants';

interface ICompareQuery {
  companies: string;
}

interface IGetPartnersQuery extends ICompareQuery {}

export const getCompanies: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const companies = await CompanyService.getCompanies(req, query);
    const sharableCompanies = {
      ...companies,
      docs: companies.docs.map(c => CompanyService.getShareableCompany(c)),
    };

    output.api(req, res, sharableCompanies);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCompanyById: IRequestHandler<{ companyId: string }> = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await CompanyService.getCompanyById(req, companyId);
    output.api(req, res, CompanyService.getShareableCompany(company));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const compare: IRequestHandler<{}, ICompareQuery> = async (req, res) => {
  try {
    const query = {
      companies: req.query?.companies ? req.query?.companies.split(',').map(val => parseInt(val)).filter(val => !isNaN(val)) : [],
    };
    if (query.companies.length < 2) {
      return output.error(req, res, new CustomError('Insufficient companies found for comparison', ErrorTypes.UNPROCESSABLE));
    }
    const data = await CompanyService.compare(req, query);
    if (data.companies.length < 2) {
      return output.error(req, res, new CustomError('Insufficient companies found for comparison', ErrorTypes.UNPROCESSABLE));
    }
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getPartners: IRequestHandler<{}, IGetPartnersQuery> = async (req, res) => {
  try {
    const { companies } = req.query;

    // return all partners if `companies` is not specified
    const _companies = !!companies ? parseInt(companies) : 999;

    if (isNaN(_companies)) throw new Error('Invalid companies. Please provide a number.');

    const data = await CompanyService.getPartners(req, _companies);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getUNSDGs: IRequestHandler<{ _id: string }> = async (req, res) => {
  try {
    const { _id } = req.params;
    const now = toUTC(new Date());

    const result = await CompanyService.getCompanyUNSDGs(req, _id, now.getFullYear());
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
