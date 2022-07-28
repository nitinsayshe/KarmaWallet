import { parse } from 'json2csv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { slugify } from '../../lib/slugify';
import {
  ErrorTypes, UserRoles, UserGroupRole,
} from '../../lib/constants';
import { IRequest } from '../../types/request';
import CustomError, { asCustomError } from '../../lib/customError';
import { AwsClient } from '../../clients/aws';
import { getCompanyById } from '../company';
import { getUserGroup, getGroup } from '../groups';
import { mockRequest } from '../../lib/constants/request';
import { Logger } from '../logger';

dayjs.extend(utc);

export enum BatchCSVUploadType {
  Companies = 'companies',
  CompaniesParentChildRelationships = 'companies-parent-child-relationships',
  DataSources = 'data-sources',
}

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

export interface ICsvUploadBody {
  filename?: string,
}

export interface IS3UploadResponse {
  url: string;
  filename: string;
}

export interface IImageData {
  file: Buffer,
  name: string,
  contentType: string,
}

export interface IJsonUploadBody {
  json: any;
  filename: string;
}

const ImageFileExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];

export const removeFileExtension = (filename: string, fileExensions: string[]) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension && fileExensions.find(ext => ext === extension)) {
    return filename.replace(`.${extension}`, '');
  }
  return filename;
};

export const checkMimeTypeForValidImageType = (mimeType: string) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(mimeType);

export const getImageFileExtensionFromMimeType = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/gif':
      return '.gif';
    case 'image/webp':
      return '.webp';
    case 'image/svg+xml':
      return '.svg';
    default:
      return '';
  }
};

export const uploadImage = async (req: IRequest<{}, {}, IUploadImageRequestBody>) => {
  const MAX_FILE_SIZE_IN_MB = 5 * 1024 * 1024;

  try {
    const { requestor, file } = req;
    const { resourceType, resourceId } = req.body;

    if (!file) {
      throw new CustomError('A file is required.', ErrorTypes.INVALID_ARG);
    }

    if (file.size > MAX_FILE_SIZE_IN_MB) {
      throw new CustomError(`File size is too large (${MAX_FILE_SIZE_IN_MB / (1024 * 1024)} MB max.).`, ErrorTypes.INVALID_ARG);
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

    const filenameSlug = `${slugify(removeFileExtension(file.originalname, ImageFileExtensions))}${getImageFileExtensionFromMimeType(file.mimetype)}`;

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
          filename = `group/${resourceId}/${itemId}-${filenameSlug}`;
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
        const { company } = await getCompanyById(mockRequest, resourceId);
        if (!company) throw new CustomError(`A company with id ${resourceId} was not found.`, ErrorTypes.NOT_FOUND);
        filename = `company/${resourceId}/${itemId}-${filenameSlug}`;
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

export const uploadCsv = async (req: IRequest<{}, {}, ICsvUploadBody>): Promise<IS3UploadResponse> => {
  const MAX_FILE_SIZE_IN_MB = 100 * 1024 * 1024;
  try {
    const { file } = req;
    const { filename } = req.body;

    if (!file) {
      throw new CustomError('A file is required.', ErrorTypes.INVALID_ARG);
    }

    if (file.mimetype !== 'text/csv') {
      throw new CustomError('Invalid file type.', ErrorTypes.INVALID_ARG);
    }

    if (file.size > MAX_FILE_SIZE_IN_MB) {
      throw new CustomError(`File size is too large (${MAX_FILE_SIZE_IN_MB / (1024 * 1024)} MB max.).`, ErrorTypes.INVALID_ARG);
    }

    removeFileExtension(slugify(filename || file.originalname), ['.csv']);

    const fileData = {
      file: file.buffer,
      // ensures that the filename has proper extension
      name: `uploads/${slugify(removeFileExtension((filename || file.originalname), ['csv']))}.csv`,
      contentType: 'application/octet-stream',
    };

    const client = new AwsClient();
    return client.uploadToS3(fileData);
  } catch (err) {
    throw asCustomError(err);
  }
};

export const uploadBatchCsv = async (req: IRequest<{}, {}, ICsvUploadBody>, batchType: BatchCSVUploadType) => {
  const { file } = req;
  if (file.mimetype !== 'text/csv') throw new CustomError('Only .csv files are supported for this action.', ErrorTypes.INVALID_ARG);

  try {
    return await uploadCsv({ ...req, body: { filename: `batch-${batchType}-to-be-created-${nanoid()}` } });
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError('An error occurred while uploading the batch companies csv file. Please try again later, or contact engineering for support.', ErrorTypes.SERVER);
  }
};

export const uploadJsonAsCSVToS3 = async (req: IRequest<{}, {}, IJsonUploadBody>) => {
  const { json, filename } = req.body;
  const _csv = parse(json);

  const fileData = {
    file: Buffer.from(_csv),
    // ensures that the filename has proper extension
    name: `uploads/${removeFileExtension((filename), ['csv'])}-${nanoid()}.csv`,
    contentType: 'application/octet-stream',
  };

  try {
    const client = new AwsClient();
    return client.uploadToS3(fileData);
  } catch (err) {
    throw asCustomError(err);
  }
};
