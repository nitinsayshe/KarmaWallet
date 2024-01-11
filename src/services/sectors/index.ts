import {
  FilterQuery, isValidObjectId, Schema,
} from 'mongoose';
import { ISector, ISectorDocument, ISectorModel, SectorModel } from '../../models/sector';
import { ErrorTypes } from '../../lib/constants';
import { mockRequest } from '../../lib/constants/request';
import CustomError, { asCustomError } from '../../lib/customError';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';

export enum SectorConfigType {
  BrowseBy = 'browse-by',
}

export interface ISectorRequestParams {
  sectorId: string;
}

export interface ISectorsRequestQuery extends FilterQuery<ISector> {
  config: SectorConfigType;
}

export interface ISectorRequestBody {
  name: string;
  carbonMultiplier: number;
  tier: number;
  parentSector: string;
}

export interface ICheckSectorNameQuery {
  name: string;
}

const MAX_SECTOR_NAME_LENGTH = 60;

const browseByQuery = {
  _id: {
    $in: [
      // apparel
      '62192ef1f022c9e3fbff0aac', // staging
      '621b9ada5f87e75f53666f38', // prod
      // technology
      '62192ef3f022c9e3fbff0c20', // staging
      '621b9adb5f87e75f536670ac', // prod
      // dining out
      '62192ef2f022c9e3fbff0aec', // staging
      '621b9ada5f87e75f53666f78', // prod
      // home & garden
      '62192ef2f022c9e3fbff0b52', // staging
      '621b9adb5f87e75f53666fde', // prod
      // travel
      '62192ef3f022c9e3fbff0c40', // staging
      '621b9adc5f87e75f536670cc', // prod
      // personal care
      '62192ef3f022c9e3fbff0ba4', // staging
      '621b9adb5f87e75f53667030', // prod
    ],
  },
};

export const checkSectorName = async (req: IRequest<{}, ICheckSectorNameQuery>) => {
  try {
    const { name } = req.query;
    if (!name) throw new CustomError('A name is required.', ErrorTypes.INVALID_ARG);

    if (name.length > MAX_SECTOR_NAME_LENGTH) {
      return {
        isValid: false,
        available: false,
      };
    }

    const existingSector = await SectorModel.findOne({ name }).lean();

    return {
      isValid: true,
      available: !existingSector,
    };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const createSector = async (req: IRequest<{}, {}, ISectorRequestBody>) => {
  try {
    const { name, carbonMultiplier, tier, parentSector } = req.body;

    if (!name) throw new CustomError('A sector name is required.', ErrorTypes.INVALID_ARG);
    const { isValid, available } = await checkSectorName({ ...mockRequest, query: { name } });
    if (!isValid) throw new CustomError(`Invalid sector name found. Must be ${MAX_SECTOR_NAME_LENGTH} characters or less.`, ErrorTypes.INVALID_ARG);
    if (!available) throw new CustomError(`Sector name: ${name} is already in use.`, ErrorTypes.INVALID_ARG);
    if (typeof carbonMultiplier === 'undefined') throw new CustomError('A carbon multiplier is required to create a sector.', ErrorTypes.INVALID_ARG);
    if (typeof carbonMultiplier !== 'number') throw new CustomError('Invalid carbon multiplier found. Must be a number.', ErrorTypes.INVALID_ARG);
    if (!tier) throw new CustomError('A tier is required to create a sector.', ErrorTypes.INVALID_ARG);
    if (typeof tier !== 'number') throw new CustomError('Invalid tier found. Must be a number.', ErrorTypes.INVALID_ARG);
    if (tier > 1) {
      if (!parentSector) {
        throw new CustomError('No parent sector found. All tiers above tier 1 must have a parent sector.', ErrorTypes.INVALID_ARG);
      }

      if (!isValidObjectId(parentSector)) {
        throw new CustomError('Invalid parent sector id found.', ErrorTypes.INVALID_ARG);
      }
    }

    let parentSectors: ISectorDocument[] = [];

    if (tier > 1) {
      const ps: ISectorDocument = await SectorModel.findOne({ _id: parentSector }).lean();
      if (!ps) throw new CustomError(`Parent sector with id: ${parentSector} could not be found.`, ErrorTypes.NOT_FOUND);

      if (tier - 1 !== ps.tier) {
        throw new CustomError('Invalid parent sector found. A parent sector must only be 1 tier above this sector\'s tier.', ErrorTypes.INVALID_ARG);
      }

      parentSectors = [ps._id, ...ps.parentSectors];
    }

    const sector = new SectorModel({
      name,
      carbonMultiplier,
      tier,
      parentSectors,
    });

    return await sector.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getSectors = async (req: IRequest<{}, ISectorsRequestQuery>, query: FilterQuery<ISector>, config?: SectorConfigType) => {
  try {
    let _config = {};

    if (!!config) {
      switch (config) {
        case SectorConfigType.BrowseBy:
          _config = browseByQuery;
          break;
        default:
          throw new CustomError(`Invalid sector config found: ${config}`, ErrorTypes.INVALID_ARG);
      }
    }

    const options = {
      projection: query?.projection || '',
      populate: query.population || [
        {
          path: 'parentSectors',
          model: SectorModel,
        },
      ],
      page: query?.skip || 1,
      sort: query?.sort ? { ...query.sort, _id: 1 } : { tier: 1, name: 1, _id: 1 },
      limit: query?.limit || 25,
    };

    const filter: FilterQuery<ISector> = {
      ..._config,
      ...query.filter,
    };

    if (!!filter.$and) {
      filter.$and = filter.$and.map(x => {
        if (!!x.name) {
          x.name = new RegExp(x.name, 'gi'); // needed because regex is converted to string in $and by aqp
        }

        return x;
      });
    }

    return SectorModel.paginate(filter, options);
  } catch (err) {
    throw asCustomError(err);
  }
};

interface ISectorFilterOption {
  tier: number;
  count: number;
}

export const getSectorsFilterOptions = async (_: IRequest) => {
  try {
    const sectors = await SectorModel.find({}).lean();

    const sectorOptions: { [key: string]: ISectorFilterOption } = {};
    let minCM = 0;
    let maxCM = 0;

    for (const sector of sectors) {
      if (sector.carbonMultiplier < minCM) minCM = sector.carbonMultiplier;
      if (sector.carbonMultiplier > maxCM) maxCM = sector.carbonMultiplier;

      const tierStr = `s${sector.tier}`;
      if (!sectorOptions[tierStr]) {
        sectorOptions[tierStr] = {
          tier: sector.tier,
          count: 0,
        };
      }

      sectorOptions[tierStr].count += 1;
    }

    return {
      tiers: Object.values(sectorOptions).sort((x, y) => x.tier - y.tier),
      carbonMultiplierRange: {
        min: minCM,
        max: maxCM,
      },
    };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableSector = ({
  _id,
  name,
  tier,
  icon,
  carbonMultiplier,
  parentSectors,
  averageScores,
  mccs,
}: ISectorDocument) => {
  const _parentSectors: IRef<Schema.Types.ObjectId, ISector>[] = parentSectors.filter(p => isValidObjectId(p)).length
    ? parentSectors
    : parentSectors.map(p => getShareableSector(p as ISectorModel));
  return {
    _id,
    name,
    tier,
    icon,
    carbonMultiplier,
    parentSectors: _parentSectors,
    averageScores,
    mccs,
  };
};

export const updateSector = async (req: IRequest<ISectorRequestParams, {}, ISectorRequestBody>) => {
  try {
    const { sectorId } = req.params;
    const { name, carbonMultiplier, tier } = req.body;

    if (!sectorId) throw new CustomError('A sector id is required.', ErrorTypes.INVALID_ARG);

    if (!name && typeof carbonMultiplier === 'undefined' && !tier) {
      throw new CustomError('No updatable sector data found.', ErrorTypes.INVALID_ARG);
    }

    const sector = await SectorModel.findOne({ _id: sectorId });
    if (!sector) throw new CustomError(`Sector with id: ${sectorId} not found.`, ErrorTypes.NOT_FOUND);

    if (!!name && name !== sector.name) {
      const { isValid, available } = await checkSectorName({ ...mockRequest, query: { name } });
      if (!isValid) throw new CustomError(`Invalid sector name found. Must be ${MAX_SECTOR_NAME_LENGTH} characters or less.`, ErrorTypes.INVALID_ARG);
      if (!available) throw new CustomError(`Sector name: ${name} is already in use.`, ErrorTypes.INVALID_ARG);

      sector.name = name;
    }

    if (typeof carbonMultiplier !== 'undefined') {
      if (typeof carbonMultiplier !== 'number') throw new CustomError('Invalid cabon multiplier found. Must be a number.', ErrorTypes.INVALID_ARG);
      sector.carbonMultiplier = carbonMultiplier;
    }

    if (!!tier) {
      throw new CustomError('Updating sector tiers is not currently supported.', ErrorTypes.UNPROCESSABLE);

      // TODO: add support for updating tier
      //   - will require updating companies that use this
      // sector, transactions that were mapped to this sector,
      // any cached values that calculate carbon offsets will
      // need to be updated, and any other sectors that had
      // this sector as a parent sector may need to be updated
      // as well, depending on the update.
    }

    return await sector.save();
  } catch (err) {
    throw asCustomError(err);
  }
};

// TODO: add support for deleting sectors.
//   - will require updating companies that use this
// sector, transactions that were mapped to this sector,
// any cached values that calculate carbon offsets will
// need to be updated, and any other sectors that had
// this sector as a parent sector may need to be updated
// as well, depending on the update.
