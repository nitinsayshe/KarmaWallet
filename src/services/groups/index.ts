import { IGroupDocument } from '../../models/group';

export const getShareableGroup = ({
  _id,
  name,
  code,
}: IGroupDocument) => ({
  _id,
  name,
  code,
});
