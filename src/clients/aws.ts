import aws from 'aws-sdk';
import { Logger } from '../services/logger';
import CustomError, { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';
import { EmailAddresses, ErrorTypes } from '../lib/constants';

interface IAwsClient {
  s3: aws.S3,
  ses: aws.SES
}

interface ISendEmailRequest {
  senderEmail?: aws.SES.Address;
  recipientEmail: aws.SES.Address;
  replyToAddresses: aws.SES.AddressList;
  template: string;
  subject: string;
  senderName?: string;
}

interface IUploadRequest {
  acl?: aws.S3.ObjectCannedACL;
  bucket?: aws.S3.BucketName;
  contentType?: aws.S3.ContentType;
  ext: string;
  file: Buffer;
  name: string;
}

export class AwsClient extends SdkClient {
  _client: IAwsClient = null;

  constructor() {
    super('Rare');
  }

  protected _init() {
    aws.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1',
    });

    this._client = {
      ses: new aws.SES(),
      s3: new aws.S3(),
    };
  }

  sendMail = ({
    senderName = 'KarmaWallet',
    senderEmail = EmailAddresses.NoReply,
    recipientEmail,
    template,
    subject,
    replyToAddresses = [EmailAddresses.ReplyTo],
  }: ISendEmailRequest) => {
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
      if (!file) throw new CustomError('An image file is required.', ErrorTypes.INVALID_ARG);
      if (!name) throw new CustomError('An file name is required.', ErrorTypes.INVALID_ARG);
      if (!ext) throw new CustomError('An file extension is required.', ErrorTypes.INVALID_ARG);

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
