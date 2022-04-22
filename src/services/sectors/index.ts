import { isValidObjectId, Schema } from 'mongoose';
import { ISector, ISectorDocument, ISectorModel } from '../../models/sector';
import { IRef } from '../../types/model';

export const getShareableSector = ({
  _id,
  name,
  tier,
  carbonMultiplier,
  parentSectors,
}: ISectorDocument) => {
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
