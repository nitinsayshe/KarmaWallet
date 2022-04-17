import {
  FilterQuery, isValidObjectId, Schema,
} from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
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

export interface ISectorsRequestQuery extends FilterQuery<ISector> {
  config: SectorConfigType;
}

const browsByQuery = {
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

export const getSectors = async (req: IRequest<{}, ISectorsRequestQuery>, query: FilterQuery<ISector>, config?: SectorConfigType) => {
  try {
    let _config = {};

    if (!!config) {
      switch (config) {
        case SectorConfigType.BrowseBy:
          _config = browsByQuery;
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
