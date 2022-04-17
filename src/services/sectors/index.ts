import { FilterQuery, isValidObjectId, Schema } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import {
  ISector,
  ISectorModel,
  SectorModel,
} from '../../models/sector';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';

export interface ISectorsRequestQuery {
  /**
   * get all sectors of a specific tier
   *
   * will be ignored if `sectorIds` query param
   * is found.
   */
  tier: number;
  /**
   * get all sectors of a specific tier and
   * all their parent sectors
   *
   * will be ignored if `tier` or `sectorIds`
   * query param is also found.
   */
  deepestTier: number;
  /**
   * an array of sectors ids to retrieve.
   *
   * will override any other query params if
   * provided.
   */
  sectorIds: string[];
}

export const getSectorsById = async (_: IRequest, sectorIds: string[]) => {
  try {
    const invalidSectorIds = sectorIds.filter(sectorId => !isValidObjectId(sectorId));

    if (invalidSectorIds) throw new CustomError(`The following sectors ids are invalid: ${invalidSectorIds.join(', ')}`, ErrorTypes.INVALID_ARG);

    const sectors = await SectorModel
      .find({ _id: { $in: sectorIds } })
      .sort({ tier: -1, name: -1 })
      .populate({
        path: 'parentSectors',
        model: SectorModel,
      });

    return sectors;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getSectorsByTier = async (_: IRequest, tier: number) => {
  try {
    if (!tier) throw new CustomError('A tier is required.', ErrorTypes.INVALID_ARG);

    const sectors = await SectorModel
      .find({ tier })
      .sort({ name: -1 })
      .populate({
        path: 'parentSectors',
        model: SectorModel,
      });

    return sectors;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getSectors = async (req: IRequest<{}, ISectorsRequestQuery>) => {
  const {
    deepestTier, sectorIds, tier,
  } = req.query;

  try {
    const query: FilterQuery<ISector> = {};

    if (!!sectorIds) return getSectorsById(req, sectorIds);
    if (!!tier) return getSectorsByTier(req, tier);
    if (!!deepestTier) query.tier = { $gte: deepestTier };

    const sectors = await SectorModel
      .find(query)
      .sort({ tier: -1, name: -1 });

    return sectors;
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
