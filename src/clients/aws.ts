import aws, { Credentials, S3, STS } from 'aws-sdk';
import { Express } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { Logger } from '../services/logger';
import CustomError, { asCustomError } from '../lib/customError';
import { SdkClient } from './sdkClient';
import { EmailAddresses, ErrorTypes, KarmaWalletCdnUrl } from '../lib/constants';
import { sleep } from '../lib/misc';
import { EarnedRewardWebhookBody } from './kard/types';
import { KardKarmaWalletAwsRole, KardIssuerAwsRole } from './kard/index';

dayjs.extend(utc);

const awsBackoffInervalMS = 500;

interface IAwsClient {
  s3: aws.S3,
  sesV2: aws.SESV2
  sts: aws.STS
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
      sts: new aws.STS(),
    };
  }

  sendMail = ({
    senderName = 'Karma Wallet',
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

      const stream = await this._client.s3.getObject(params).promise();
      return stream;
    } catch (err) {
      const error = asCustomError(err);
      Logger.error(error);
      throw error;
    }
  };

  listObjectsInBucket = async (bucketUrl: string) => {
    try {
      const bucket = bucketUrl.split('s3://')[1].split('/')[0];
      const prefix = bucketUrl.split('s3://')[1].split(`${bucket}/`)[1];
      const params = {
        Bucket: bucket,
        Prefix: prefix,
      };

      const response = await this._client.s3.listObjectsV2(params).promise();
      return response?.Contents;
    } catch (err) {
      const error = asCustomError(err);
      Logger.error(error);
      throw error;
    }
  };

  assumeRole = async (roleArn: string, roleSessionName: string) => {
    try {
      const params = {
        RoleArn: roleArn,
        RoleSessionName: roleSessionName,
        DurationSeconds: 3600,
      };
      const response = await this._client.sts.assumeRole(params).promise();
      return response?.Credentials;
    } catch (err) {
      const error = asCustomError(err);
      Logger.error(error);
      throw error;
    }
  };

  private getKardBucketClient = async (): Promise<aws.S3> => {
    // assume correct role at karma wallet
    const creds = await this.assumeRole(KardKarmaWalletAwsRole, `session-KardKarmaWalletAwsRole-${(new Types.ObjectId()).toString()}`);
    const { AccessKeyId, SecretAccessKey, SessionToken } = creds;

    const client = new STS({
      credentials: new Credentials({ accessKeyId: AccessKeyId, secretAccessKey: SecretAccessKey, sessionToken: SessionToken }),
    });

    // assume correct role at kard
    const kardCredSTSClient = await client
      .assumeRole({
        RoleArn: KardIssuerAwsRole,
        RoleSessionName: `session-KardAwsRole-${(new Types.ObjectId()).toString()}`,
        DurationSeconds: 3600,
      })
      .promise();

    return new S3({
      credentials: new Credentials({
        accessKeyId: kardCredSTSClient.Credentials?.AccessKeyId,
        secretAccessKey: kardCredSTSClient.Credentials?.SecretAccessKey,
        sessionToken: kardCredSTSClient.Credentials?.SessionToken,
      }),
    });
  };

  public assumeKardRoleAndGetBucketContents = async (bucket: string, prefix: string, startDate?: Date): Promise<EarnedRewardWebhookBody[]> => {
    const s3Client = await this.getKardBucketClient();

    const params = {
      Bucket: bucket,
      Prefix: prefix,
    };

    const objectNames = await s3Client.listObjectsV2(params).promise();

    const contents = objectNames?.Contents;
    let objects: EarnedRewardWebhookBody[] = [];

    await sleep(awsBackoffInervalMS);
    for (let i = 0; i < contents?.length; i++) {
      const content = contents[i];
      if (!content?.Key) continue;
      if (content?.StorageClass === 'GLACIER') {
        console.log(`skipping ${content.Key} because it is in GLACIER`);
        continue; // got to restore these before we can download them
      }

      if (!!content?.LastModified && !!startDate && dayjs(startDate).isBefore(content.LastModified)) {
        console.log(`skipping ${content.Key} because it is before ${startDate}`);
        continue;
      }

      const downloadFileParams = {
        Key: content?.Key,
        Bucket: bucket,
      };

      // get webhooks from S3
      const webhookFile = await s3Client.getObject(downloadFileParams).promise();

      let data: EarnedRewardWebhookBody[] = [];
      try {
        data = JSON.parse(webhookFile.Body.toString())?.data;
      } catch (err) {
        console.log(err);
        continue;
      }
      if (!!data?.length) {
        objects = [...objects, ...data];
        console.log(`found ${data.length} objects in ${downloadFileParams.Key}`);
      }
      await sleep(awsBackoffInervalMS);
    }
    return objects;
  };
}
