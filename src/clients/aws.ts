import aws, { SES, S3 } from 'aws-sdk';
import { SdkClient } from './sdkClient';
import { EmailAddresses } from '../lib/constants';
import { Logger } from '../services/logger';
import { asCustomError } from '../lib/customError';

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
});

interface IAwsClient {
  ses: SES;
  s3: S3;
}

interface ISendEmailRequest {
  senderEmail?: SES.Address;
  recipientEmail: SES.Address;
  replyToAddresses: SES.AddressList;
  template: string;
  subject: string;
  senderName?: string;
}

interface IUploadRequest {
  acl?: S3.ObjectCannedACL;
  bucket?: S3.BucketName;
  contentType?: S3.ContentType;
  ext: string;
  file: Buffer;
  name: string;
}

export class AwsClient extends SdkClient {
  _client: IAwsClient = null;

  constructor() {
    super('AWS');
  }

  _init = () => {
    aws.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    this._client = {
      ses: new aws.SES(),
      s3: new aws.S3(),
    };
  };

  sendMail = ({
    senderName = 'KarmaWallet',
    senderEmail = EmailAddresses.NoReply,
    recipientEmail,
    template,
    subject,
    replyToAddresses = [EmailAddresses.ReplyTo],
  }: ISendEmailRequest) => {
    // https://betterprogramming.pub/how-to-send-emails-with-node-js-using-amazon-ses-8ae38f6312e4
    const params = {
      Source: `${senderName} <${senderEmail}>`,
      Destination: {
        ToAddresses: [
          recipientEmail,
        ],
      },
      ReplyToAddresses: replyToAddresses,
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: template,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
    };
    return this._client.ses.sendEmail(params).promise();
  };

  uploadImage = async ({
    acl = 'public-read',
    bucket = process.env.S3_BUCKET,
    contentType,
    ext,
    file,
    name,
  }: IUploadRequest) => {
    try {
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

      const result = await this._client.s3.upload(imageData).promise();

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
}
