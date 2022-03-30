import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import {
  ErrorTypes, UserRoles, UserGroupRole,
} from '../../lib/constants';
import { IRequest } from '../../types/request';
import CustomError, { asCustomError } from '../../lib/customError';
import { AwsClient } from '../../clients/aws';
import { getCompanyById } from '../company';
import { getUserGroup, getGroup } from '../groups';
import { mockRequest } from '../../lib/constants/request';

dayjs.extend(utc);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

export const checkMimeTypeForImage = (mimeType: string) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return allowedMimeTypes.includes(mimeType);
};

export const uploadImage = async (req: IRequest<{}, {}, IUploadImageRequestBody>) => {
  try {
    const { requestor, file } = req;
    const { resourceType, resourceId } = req.body;

    if (!file) {
      throw new CustomError('A file is required', ErrorTypes.INVALID_ARG);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new CustomError('File size is too large', ErrorTypes.INVALID_ARG);
    }

    if (!checkMimeTypeForImage(file.mimetype)) {
      throw new CustomError('Invalid file type', ErrorTypes.INVALID_ARG);
    }

    if (!resourceType) {
      throw new CustomError('A resource type must be specified.', ErrorTypes.INVALID_ARG);
    }

    if (!Object.values(ResourceTypes).includes(resourceType)) {
      throw new CustomError('Invalid resource type', ErrorTypes.INVALID_ARG);
    }

    if (!!resourceId && !Types.ObjectId.isValid(resourceId)) {
      throw new CustomError('Invalid resource id', ErrorTypes.INVALID_ARG);
    }

    const imageData = {
      file: file.buffer, name: file.originalname, contentType: file.mimetype,
    };

    const requestorId = requestor._id.toString();
    const itemId = nanoid(10);
    let filename: string;

    // ResourceType Checks
    switch (resourceType) {
      case ResourceTypes.GroupLogo: {
        if ([UserRoles.Admin, UserRoles.SuperAdmin].find(r => r === requestor.role)) {
          const groupRequest = {
            ...req,
            requestor,
            body: {},
            params: {
              groupId: resourceId,
            },
            query: {},
          };
          const group = await getGroup(groupRequest);
          if (!group) throw new CustomError(`A group with id ${resourceId} does not exist.`, ErrorTypes.NOT_FOUND);
          filename = `group/${resourceId}/${itemId}-${file.originalname}`;
          break;
        }
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
        if (![UserGroupRole.Admin, UserGroupRole.Owner, UserGroupRole.SuperAdmin].find(r => r === userGroup.role)) throw new CustomError('You are not authorized to upload a logo to this group.', ErrorTypes.UNAUTHORIZED);
        filename = `group/${resourceId}/${itemId}-${file.originalname}`;
        break;
      }
      case ResourceTypes.UserAvatar:
        filename = `users/${requestorId}/${itemId}-${file.originalname}`;
        break;
      case ResourceTypes.Karma:
        if (requestor.role === UserRoles.None) {
          throw new CustomError('Unauthorized', ErrorTypes.UNAUTHORIZED);
        }
        filename = `uploads/${itemId}-${file.originalname}`;
        break;
      case ResourceTypes.CompanyLogo: {
        // TODO: verify members should be able to upload company logos
        if (requestor.role === UserRoles.None) {
          throw new CustomError('You are not authorized to upload an image of this resource type.', ErrorTypes.UNAUTHORIZED);
        }
        const company = await getCompanyById(mockRequest, resourceId);
        if (!company) throw new CustomError(`A company with id ${resourceId} was not found`, ErrorTypes.NOT_FOUND);
        // TODO: through slugify company name and add to filename
        const companyNameSlug = company.companyName.replace(/\s+/g, '-').toLowerCase();
        filename = `company/${resourceId}/${itemId}-${companyNameSlug}`;
        break;
      }
      default:
        throw new CustomError('Invalid resource type', ErrorTypes.INVALID_ARG);
    }

    imageData.name = filename;
    const client = new AwsClient();
    const imageResponse = await client.uploadImage(imageData);
    return imageResponse;
  } catch (err) {
    throw asCustomError(err);
  }
};
