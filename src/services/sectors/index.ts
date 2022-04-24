import {
  FilterQuery, isValidObjectId, Schema,
} from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import { mockRequest } from '../../lib/constants/request';
import CustomError, { asCustomError } from '../../lib/customError';
import {
  ISector,
  ISectorModel,
  SectorModel,
} from '../../models/sector';
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

export interface IUpdateSectorRequestBody {
  name: string;
  carbonMultiplier: number;
  tier: number;
}

export interface ICheckSectorNameQuery {
  name: string;
}

const MAX_SECTOR_NAME_LENGTH = 60;

const browseByQuery = {
  _id: {
    $in: [
      '62192ef1f022c9e3fbff0aac',
      '62192ef3f022c9e3fbff0c20',
      '62192ef2f022c9e3fbff0aec',
      '62192ef2f022c9e3fbff0b52',
      '62192ef3f022c9e3fbff0c40',
      '62192ef3f022c9e3fbff0ba4',
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
  carbonMultiplier,
  parentSectors,
}: ISectorModel) => {
  const _parentSectors: IRef<Schema.Types.ObjectId, ISector>[] = parentSectors.filter(p => isValidObjectId(p)).length
    ? parentSectors
    : parentSectors.map(p => getShareableSector(p as ISectorModel));
  return {
    _id,
    name,
    tier,
    carbonMultiplier,
    parentSectors: _parentSectors,
  };
};

export const updateSector = async (req: IRequest<ISectorRequestParams, {}, IUpdateSectorRequestBody>) => {
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

    console.log('\n>>>>> carbonMultiplier', carbonMultiplier, '\n');

    if (typeof carbonMultiplier !== 'undefined') {
      if (typeof carbonMultiplier !== 'number') throw new CustomError('Invalid cabon multiplier found. Must be a number.', ErrorTypes.INVALID_ARG);
      sector.carbonMultiplier = carbonMultiplier;
    }

    // TODO: add support for updating tier
    //   - will require updating companies that use this
    // sector, transactions that were mapped to this sector,
    // any cached values that calculate carbon offsets will
    // need to be updated, and any other sectors that had
    // this sector as a parent sector may need to be updated
    // as well, depending on the update.

    return await sector.save();
  } catch (err) {
    throw asCustomError(err);
  }
};
