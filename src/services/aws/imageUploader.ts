import { asCustomError } from '../../lib/customError';
import { Logger } from '../logger';
import AwsClient from './client';

interface IUploadRequest {
  acl?: AwsClient.S3.ObjectCannedACL;
  bucket?: AwsClient.S3.BucketName;
  contentType?: AwsClient.S3.ContentType;
  ext: string;
  file: Buffer;
  name: string;
}

/**
 * uploads an image to the KW AWS S3
 */
export const uploadImage = async ({
  acl = 'public-read',
  bucket = process.env.S3_BUCKET,
  contentType,
  ext,
  file,
  name,
}: IUploadRequest) => {
  try {
    const client = new AwsClient.S3();

    if (!file) return { error: 'An image file is required.', code: 422 };
    if (!name) return { error: 'A filename is required.', code: 422 };
    if (!ext) return { error: 'A file extension is required.', code: 422 };

    const imageData = {
      ACL: acl,
      Body: file,
      Bucket: bucket,
      ContentType: contentType || `image/${ext === 'svg' ? 'svg+xml' : ext}`,
      Key: `${name}.${ext}`,
    };

    const result = await client.upload(imageData).promise();

    const image = {
      url: result.Location,
      filename: result.Key,
    };

    return { image };
  } catch (err) {
    const error = asCustomError(err);
    Logger.error(error);
    throw error;
  }
};
