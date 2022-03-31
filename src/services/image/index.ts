import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
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

const MAX_FILE_SIZE_IN_MB = 5 * 1024 * 1024;

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

export const checkMimeTypeForValidImageType = (mimeType: string) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(mimeType);

export const uploadImage = async (req: IRequest<{}, {}, IUploadImageRequestBody>) => {
  try {
    const { requestor, file } = req;
    const { resourceType, resourceId } = req.body;

    if (!file) {
      throw new CustomError('A file is required.', ErrorTypes.INVALID_ARG);
    }

    if (file.size > MAX_FILE_SIZE_IN_MB) {
      throw new CustomError(`File size is too large (${MAX_FILE_SIZE_IN_MB} MB max.).`, ErrorTypes.INVALID_ARG);
    }

    if (!checkMimeTypeForValidImageType(file.mimetype)) {
      throw new CustomError('Invalid file type.', ErrorTypes.INVALID_ARG);
    }

    if (!resourceType) {
      throw new CustomError('A resource type must be specified.', ErrorTypes.INVALID_ARG);
    }

    if (!Object.values(ResourceTypes).includes(resourceType)) {
      throw new CustomError('Invalid resource type.', ErrorTypes.INVALID_ARG);
    }

    if (!!resourceId && !Types.ObjectId.isValid(resourceId)) {
      throw new CustomError('Invalid resource id.', ErrorTypes.INVALID_ARG);
    }

    const filenameSlug = slugify(file.originalname);

    const imageData = {
      file: file.buffer,
      name: filenameSlug,
      contentType: file.mimetype,
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
        filename = `group/${resourceId}/${itemId}-${filenameSlug}`;
        break;
      }
      case ResourceTypes.UserAvatar:
        filename = `users/${requestorId}/${itemId}-${filenameSlug}`;
        break;
      case ResourceTypes.Karma:
        if (requestor.role === UserRoles.None) {
          throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
        }
        filename = `uploads/${itemId}-${filenameSlug}`;
        break;
      case ResourceTypes.CompanyLogo: {
        if (requestor.role === UserRoles.None) {
          throw new CustomError('You are not authorized to upload an image of this resource type.', ErrorTypes.UNAUTHORIZED);
        }
        const company = await getCompanyById(mockRequest, resourceId);
        if (!company) throw new CustomError(`A company with id ${resourceId} was not found.`, ErrorTypes.NOT_FOUND);
        filename = `company/${resourceId}/${itemId}-${company.slug}`;
        break;
      }
      default:
        throw new CustomError('Invalid resource type.', ErrorTypes.INVALID_ARG);
    }

    imageData.name = filename;
    const client = new AwsClient();
    return client.uploadToS3(imageData);
  } catch (err) {
    throw asCustomError(err);
  }
};
