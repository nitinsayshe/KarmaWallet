import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IGroupDocument, GroupModel } from '../../models/group';
import { IRequest } from '../../types/request';

export const getShareableGroup = ({
  _id,
  name,
  code,
  domains,
  settings,
  owner,
  lastModified,
}: IGroupDocument) => ({
  _id,
  name,
  code,
  domains,
  settings,
  owner,
  lastModified,
});

export const getGroup = async (_: IRequest, code: string) => {
  if (!code) {
    throw new CustomError('Group code required', ErrorTypes.INVALID_ARG);
  }
  const group = await GroupModel.findOne({ code });
  return getShareableGroup(group);
};
