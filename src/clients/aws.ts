import aws from 'aws-sdk';
import { Express } from 'express';
import { Logger } from '../services/logger';
import CustomError, { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';
import { EmailAddresses, ErrorTypes, KarmaWalletCdnUrl } from '../lib/constants';

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
  file: Express.Multer.File | Blob | Buffer | string;
  name?: string;
}

export class AwsClient extends SdkClient {
  _client: IAwsClient;

  constructor() {
    super('AWS');
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
    file,
    name,
  }: IUploadRequest) => {
    try {
      if (!file) throw new CustomError('An image file is required.', ErrorTypes.INVALID_ARG);
      if (!name) throw new CustomError('An file name is required.', ErrorTypes.INVALID_ARG);

      const imageData = {
        ACL: acl,
        Body: file,
        Bucket: bucket,
        ContentType: contentType,
        Key: name,
      };

      const result = await this._client.s3.upload(imageData)
        .promise();

      const rawUrl = result.Location;

      const image = {
        // this can be modified to support more buckets
        // w/ subdomain CNAME paths in the future
        url: process.env.S3_BUCKET === KarmaWalletCdnUrl ? rawUrl.replace('https://s3.amazonaws.com/', 'https://') : rawUrl,
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
