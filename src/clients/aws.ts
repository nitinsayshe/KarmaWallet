import aws from 'aws-sdk';
import { Express } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Logger } from '../services/logger';
import CustomError, { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';
import { EmailAddresses, ErrorTypes, KarmaWalletCdnUrl } from '../lib/constants';

dayjs.extend(utc);

interface IAwsClient {
  s3: aws.S3,
  sesV2: aws.SESV2
}

interface ISendEmailRequest {
  senderEmail?: aws.SESV2.EmailAddress;
  recipientEmail: aws.SESV2.EmailAddress;
  replyToAddresses: aws.SESV2.EmailAddressList;
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
      sesV2: new aws.SESV2({ apiVersion: '2019-09-27' }),
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
    const params: aws.SESV2.SendEmailRequest = {
      FromEmailAddress: `${senderName} <${senderEmail}>`,
      ReplyToAddresses: replyToAddresses,
      Content: {
        Simple: {
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
      },
      Destination: {
        ToAddresses: [
          recipientEmail,
        ],
      },
    };
    return this._client.sesV2.sendEmail(params).promise();
  };

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SESV2.html#listSuppressedDestinations-property
  getSuppressedDestinations = ({
    EndDate = new Date(),
    // startDate going back five years by default
    StartDate = dayjs().utc().subtract(5, 'years').toDate(),
    NextToken = null,
    PageSize = 100,
  }: aws.SESV2.ListSuppressedDestinationsRequest): Promise<aws.SESV2.ListSuppressedDestinationsResponse> => this._client.sesV2.listSuppressedDestinations({
    EndDate,
    StartDate,
    PageSize,
    NextToken,
  }).promise();

  uploadToS3 = async ({
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

      return {
        // this can be modified to support more buckets
        // w/ subdomain CNAME paths in the future
        url: process.env.S3_BUCKET === KarmaWalletCdnUrl ? rawUrl.replace('https://s3.amazonaws.com/', 'https://') : rawUrl,
        filename: result.Key,
      };
    } catch (err) {
      const error = asCustomError(err);
      Logger.error(error);
      throw error;
    }
  };

  getS3ResourceStream = async (key: string, bucket = process.env.S3_BUCKET) => {
    try {
      const params = {
        Bucket: bucket,
        Key: key,
      };

      const stream = await this._client.s3.getObject(params).createReadStream();

      return stream;
    } catch (err) {
      const error = asCustomError(err);
      Logger.error(error);
      throw error;
    }
  };
}
