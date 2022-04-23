import { asCustomError } from '../lib/customError';
import * as output from '../services/output';
import * as ImpactService from '../services/impact';
import { IRequestHandler } from '../types/request';
import { getShareableSector } from '../services/sectors';
import { ISectorDocument } from '../models/sector';
import { getShareableCompany } from '../services/company';
import { ICompanyDocument } from '../models/company';

export const getCarbonOffsetsAndEmissions: IRequestHandler = async (req, res) => {
  try {
    const carbonOffsetsAndEmissionsData = await ImpactService.getCarbonOffsetsAndEmissions(req);
    output.api(req, res, carbonOffsetsAndEmissionsData);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCarbonOffsetDonationSuggestions: IRequestHandler = async (req, res) => {
  try {
    const offsetDonationSuggestions = await ImpactService.getCarbonOffsetDonationSuggestions(req);
    output.api(req, res, offsetDonationSuggestions);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getTopCompanies: IRequestHandler<{}, ImpactService.ITopCompaniesRequestQuery> = async (req, res) => {
  try {
    const companies = await ImpactService.getTopCompanies(req);

    output.api(req, res, {
      companies: companies.map(c => getShareableCompany(c as ICompanyDocument)),
    });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getTopSectors: IRequestHandler<{}, ImpactService.ITopSectorsRequestQuery> = async (req, res) => {
  try {
    const topSectors = await ImpactService.getTopSectors(req);
    output.api(req, res, {
      ...topSectors,
      sectors: topSectors.sectors.map(s => getShareableSector(s as ISectorDocument)),
    });
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
