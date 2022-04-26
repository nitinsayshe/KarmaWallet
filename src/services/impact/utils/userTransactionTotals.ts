import { FilterQuery, ObjectId } from 'mongoose';
import { ErrorTypes } from '../../../lib/constants';
import CustomError, { asCustomError } from '../../../lib/customError';
import { CompanyModel, ICompanyDocument } from '../../../models/company';
import { ISectorDocument, SectorModel } from '../../../models/sector';
import {
  ICompanyTransactionTotals, ISectorTransactionTotals, IUserTransactionTotal, UserTransactionTotalModel,
} from '../../../models/userTransactionTotals';

interface IBaseTopParams {
  uids: string | string[] | ObjectId | ObjectId[];
  count?: number;
}

export interface ITopCompaniesOfSectorsParams extends IBaseTopParams {
  sectors: (string | ObjectId)[];
  validator?(company: ICompanyDocument): boolean;
}

export interface ITopCompanyParams extends IBaseTopParams {
  validator?(companyTransactionTotal: ICompanyTransactionTotals): boolean;
}

export interface ITopSectorsParams extends IBaseTopParams {
  tiers?: number | number[];
  sectorsToExclude?: (string | ObjectId)[];
  validator?(sectorTransactionTotal: ISectorTransactionTotals): boolean;
}

export const getTopCompaniesOfSectorsFromTransactionTotals = async ({
  uids,
  sectors,
  count,
  validator,
}: ITopCompaniesOfSectorsParams) => {
  try {
    if (!sectors || !sectors.length) throw new CustomError('At least one sector is required to get top companies of sectors.', ErrorTypes.INVALID_ARG);

    const query: FilterQuery<IUserTransactionTotal> = {
      user: Array.isArray(uids)
        ? { $in: uids }
        : uids,
    };

    const data = await UserTransactionTotalModel
      .find(query)
      .populate({
        path: 'groupedBySector.companies',
        model: CompanyModel,
        populate: [
          {
            path: 'parentCompany',
            model: CompanyModel,
            populate: {
              path: 'sectors.sector',
              model: SectorModel,
            },
          },
          {
            path: 'sectors.sector',
            model: SectorModel,
          },
        ],
      });

    return data.map(({ user, groupedBySector = [] }) => {
      const gbs = (groupedBySector.length ? groupedBySector : []);
      const companies: ICompanyDocument[] = [];

      for (const sectorGroup of gbs) {
        if (sectors.find(s => s.toString() === sectorGroup.sector.toString())) {
          for (const company of sectorGroup.companies) {
            if (!company) continue;

            let include = true;

            if (!!validator) {
              include = validator(company as ICompanyDocument);
            }

            if (include) companies.push(company as ICompanyDocument);

            if (!!count && companies.length === count) break;
          }
        }
      }

      return { user, companies };
    });
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTopCompaniesFromTransactionTotals = async ({
  uids,
  count,
  validator,
}: ITopCompanyParams) => {
  try {
    const query: FilterQuery<IUserTransactionTotal> = {
      user: Array.isArray(uids)
        ? { $in: uids }
        : uids,
    };

    const data = await UserTransactionTotalModel
      .find(query)
      .populate({
        path: 'groupedByCompany.company',
        model: CompanyModel,
        populate: {
          path: 'sectors.sector',
          model: SectorModel,
        },
      });

    return data.map(({ user, groupedByCompany = [] }) => {
      const cbs = (groupedByCompany.length ? groupedByCompany : []);
      const companyTransactionTotals = !!count
        ? cbs
          .filter(c => {
            if (!c) return false;
            if (!!validator) return validator(c);
            return true;
          })
          .slice(0, count)
        : cbs;

      return { user, companyTransactionTotals };
    });
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTopSectorsFromTransactionTotals = async ({
  uids,
  tiers,
  sectorsToExclude = [],
  count,
  validator,
}: ITopSectorsParams) => {
  try {
    const query: FilterQuery<IUserTransactionTotal> = {
      user: Array.isArray(uids)
        ? { $in: uids }
        : uids,
    };

    const data = await UserTransactionTotalModel
      .find(query)
      .populate({
        path: 'groupedBySector.sector',
        model: SectorModel,
      });

    return data.map(({ user, groupedBySector = [] }) => {
      const gbs = (groupedBySector.length ? groupedBySector : []);
      const sectorTransactionTotals: ISectorTransactionTotals[] = [];

      for (const sectorGroup of gbs) {
        let include = true;

        if (!!tiers) {
          include = Array.isArray(tiers)
            ? !!tiers.find(t => t === sectorGroup.tier)
            : tiers === sectorGroup.tier;
        }

        if (!!include && !!sectorsToExclude.length) {
          include = !sectorsToExclude.find(ste => ste.toString() === (sectorGroup.sector as ISectorDocument)._id.toString());
        }

        if (!!include && !!validator) include = validator(sectorGroup);

        if (include) sectorTransactionTotals.push(sectorGroup);

        if (!!count && sectorTransactionTotals.length === count) break;
      }

      return { user, sectorTransactionTotals };
    });
  } catch (err) {
    throw asCustomError(err);
  }
};
