import { ISectorModel } from '../../models/sector';

export const getSharableSector = ({
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
