import { FilterQuery, ObjectId } from 'mongoose';
import { ISectorDocument, SectorModel } from '../../../models/sector';
import { ISectorTransactionTotals, IUserTransactionTotal, UserTransactionTotalModel } from '../../../models/userTransactionTotals';

export interface ITopSectorsParams {
  uids: string | string[] | ObjectId | ObjectId[];
  tiers?: number | number[];
  sectorsToExclude?: (string | ObjectId)[];
  count?: number,
}

export const getTopSectorsFromTransactionTotals = async ({
  uids,
  tiers,
  sectorsToExclude = [],
  count = 4,
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

        if (include) sectorTransactionTotals.push(sectorGroup);

        if (!!count && sectorTransactionTotals.length === count) break;
      }

      return { user, sectorTransactionTotals };
    });
  } catch (err) {
    console.log(err);
  }
};
