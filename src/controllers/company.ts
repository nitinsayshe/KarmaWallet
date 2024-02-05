import aqp from 'api-query-params';
import { IRequestHandler } from '../types/request';
import * as CompanyService from '../services/company';
import * as output from '../services/output';
import CustomError, { asCustomError } from '../lib/customError';
import { ErrorTypes } from '../lib/constants';
import { ICompanyDocument } from '../models/company';
import { getShareableMerchantRate } from '../services/merchantRates';

interface ICompareQuery {
  companies: string;
}

export const getCompanies: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const companies = await CompanyService.getCompanies(req, query);
    const sharableCompanies = {
      ...companies,
      docs: companies.docs.map((c: ICompanyDocument) => CompanyService.getShareableCompany(c)),
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

    output.api(req, res, {
      company: CompanyService.getShareableCompany(company.company),
      unsdgs: company.unsdgs.map(unsdg => CompanyService.getShareableCompanyUnsdg(unsdg)),
      companiesOwned: company.companiesOwned.map(c => CompanyService.getShareableCompany(c)),
      companyDataSources: company.companyDataSources.map(cds => CompanyService.getShareableDataSource(cds)),
    });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getSample: IRequestHandler = async (req, res) => {
  try {
    const companies = await CompanyService.getSample(req);
    output.api(req, res, companies.map((c: ICompanyDocument) => CompanyService.getShareableCompany(c)));
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

export const getUNSDGs: IRequestHandler<{ _id: string }> = async (req, res) => {
  try {
    const { _id } = req.params;
    const result = await CompanyService.getCompanyUNSDGs(req, { company: _id });
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCompanyScoreRange: IRequestHandler = async (req, res) => {
  try {
    const result = await CompanyService.getCompanyScoreRange(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getMerchantRatesForCompany: IRequestHandler<{ companyId: string }> = async (req, res) => {
  try {
    const result = await CompanyService.getMerchantRatesForCompany(req);
    output.api(req, res, result.map(mr => getShareableMerchantRate(mr)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getPartnersCount: IRequestHandler = async (req, res) => {
  try {
    const result = await CompanyService.getPartnersCount(req);
    output.api(req, res, result);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getAllPartners: IRequestHandler = async (req, res) => {
  try {
    const result = await CompanyService.getAllPartners(req);
    output.api(req, res, result.map(c => CompanyService.getShareableCompany(c)));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getPartner: IRequestHandler<{}, CompanyService.IGetPartnerQuery, {}> = async (req, res) => {
  try {
    const result = await CompanyService.getPartner(req);
    output.api(req, res, CompanyService.getShareableCompany(result));
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getFeaturedCashbackCompanies: IRequestHandler = async (req, res) => {
  try {
    const query = aqp(req.query, { skipKey: 'page' });
    const companies = await CompanyService.getFeaturedCashbackCompanies(req, query);
    const shareableCompanies = companies.docs.map((c: ICompanyDocument) => CompanyService.getShareableCompany(c));
    const sortedShareable = CompanyService.sortByMaxRate(shareableCompanies);
    const toReturn = {
      ...companies,
      docs: sortedShareable,
    };

    output.api(req, res, !companies.docs.length ? companies : toReturn);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
