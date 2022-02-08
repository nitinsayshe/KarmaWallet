import { ISectorModel } from '../../models/sector';

export const getShareableSector = ({
  _id,
  name,
  tier,
  carbonMultiplier,
}: ISectorModel) => ({
  _id,
  name,
  tier,
  carbonMultiplier,
});
