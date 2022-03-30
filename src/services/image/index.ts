import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  ErrorTypes, UserRoles, UserGroupRole,
} from '../../lib/constants';
import { IRequest } from '../../types/request';
import CustomError, { asCustomError } from '../../lib/customError';
import { AwsClient } from '../../clients/aws';
import { getCompanyById } from '../company';
import { getUserGroup } from '../groups';
import { mockRequest } from '../../lib/constants/request';

dayjs.extend(utc);

export enum ResourceTypes {
  GroupLogo = 'groupLogo',
  UserAvatar = 'userAvatar',
  Karma = 'karma',
  CompanyLogo = 'companyLogo'
}

export interface IUploadImageRequestBody {
  resourceType: ResourceTypes;
  resourceId?: string;
}

export const uploadImage = async (req: IRequest<{}, {}, IUploadImageRequestBody>) => {
  try {
    const { requestor, file } = req;
    const { resourceType, resourceId } = req.body;

    if (!resourceType) {
      throw new CustomError('A resource type must be specified.', ErrorTypes.INVALID_ARG);
    }
    if (!Object.values(ResourceTypes).includes(resourceType)) {
      throw new CustomError('Invalid resource type', ErrorTypes.INVALID_ARG);
    }

    const imageData = {
      file: file.buffer, name: file.originalname, bucket: 'dev.karmawallet.io', contentType: file.mimetype,
    };

    const requestorId = requestor._id.toString();
    const dateString = dayjs().utc().toDate().toISOString();
    let filename: string;

    // ResourceType Checks
    switch (resourceType) {
      case ResourceTypes.GroupLogo: {
        // checking if the requestor is karma admin or above
        // before checking userGroup permissions
        if (![UserRoles.Admin, UserRoles.SuperAdmin].find(r => r === requestor.role)) {
          const userGroupRequest = {
            ...req,
            requestor,
            body: {},
            params: {
              groupId: resourceId,
              userId: requestorId,
            },
            query: {},
          };
          const userGroup = await getUserGroup(userGroupRequest);
          if ([UserGroupRole.Admin, UserGroupRole.Owner, UserGroupRole.SuperAdmin].find(r => r === userGroup.role)) throw new CustomError('You are not authorized to upload a logo to this group.', ErrorTypes.UNAUTHORIZED);
        }
        filename = `group/${resourceId}/${dateString}_${file.originalname}`;
        break;
      }
      case ResourceTypes.UserAvatar:
        filename = `users/${requestorId}/${dateString}_${file.originalname}`;
        break;
      case ResourceTypes.Karma:
        if (requestor.role === UserRoles.None) {
          throw new CustomError('You are not authorized to upload an image of this resource type.', ErrorTypes.UNAUTHORIZED);
        }
        filename = `uploads/${dateString}_${requestorId}_${file.originalname}`;
        break;
      case ResourceTypes.CompanyLogo: {
        // TODO: check if UserRoles permissions are correct
        if (requestor.role === UserRoles.None) {
          throw new CustomError('You are not authorized to upload an image of this resource type.', ErrorTypes.UNAUTHORIZED);
        }
        const company = await getCompanyById(mockRequest, resourceId);
        if (!company) throw new CustomError(`A company with id ${resourceId} was not found`, ErrorTypes.NOT_FOUND);
        // TODO: through slugify company name and add to filename
        const companyNameSlug = company.companyName.replace(/\s+/g, '-').toLowerCase();
        filename = `company/${resourceId}/${dateString}_${companyNameSlug}`;
        break;
      }
      default:
        throw new CustomError('Invalid resource type', ErrorTypes.INVALID_ARG);
    }

    // upload image
    imageData.name = filename;
    const client = new AwsClient();
    const imageResponse = await client.uploadImage(imageData);
    return imageResponse;
  } catch (err) {
    throw asCustomError(err);
  }
};
