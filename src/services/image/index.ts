import {
  ErrorTypes,
  UserRoles,
} from '../../lib/constants';
import { IRequest } from '../../types/request';
import CustomError, { asCustomError } from '../../lib/customError';

export enum ResourceTypes {
  GroupLogo = 'groupLogo',
  UserAvatar = 'userAvatar',
  Karma = 'karma',
  CompanyLogo = 'companyLogo'
}

export interface IUploadImageRequestBody {
  file: Blob;
  resourceType: ResourceTypes;
  resourceId?: String;
}

export const uploadImage = async (req: IRequest<{}, {}, IUploadImageRequestBody>) => {
  try {
    const { requestor } = req;
    const { resourceType, resourceId, file } = req.body;
    let url: string;
    if (!resourceType) {
      throw new CustomError('A resource type must be specified.', ErrorTypes.INVALID_ARG);
    }
    if (!Object.values(ResourceTypes).includes(resourceType)) {
      throw new CustomError('Invalid resource type', ErrorTypes.INVALID_ARG);
    }
    if (resourceType === ResourceTypes.Karma) {
      if (requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to upload an image of this resource type.', ErrorTypes.UNAUTHORIZED);
      }
      url = 'https://cdn.karmawallet.io/uploads/1212832_234234234_234234.png';
    }
    if (resourceType === ResourceTypes.CompanyLogo) {
      // TODO: verify access control for changing a company logo
      if (requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to upload an image of this resource type.', ErrorTypes.UNAUTHORIZED);
      }
      // check requestor privs
      url = 'https://cdn.karmawallet.io/company/8sdfsdfj93jsssd/logo.png';
    }
    if (resourceType === ResourceTypes.GroupLogo) {
      // check group/usergroup
      url = 'https://cdn.karmawallet.io/group/8sdfsdfjffsdd3sd/logo.png';
    }
    if (resourceType === ResourceTypes.UserAvatar) {
      // do user stuff
      url = 'https://cdn.karmawallet.io/user/8sdfsdfjfferd3sd/logo.png';
    }
    // upload image
    return url;
  } catch (err) {
    throw asCustomError(err);
  }
};
