import { SandboxedJob } from 'bullmq';
import aws from 'aws-sdk';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AwsClient } from '../clients/aws';
import { JobNames } from '../lib/constants/jobScheduler';
import { UserEmailStatus, UserModel } from '../models/user';

dayjs.extend(utc);

export interface IGetAllSuppresionListItemsParams {
  NextToken?: aws.SESV2.NextToken;
  suppressionListItems?: aws.SESV2.SuppressedDestinationSummaries;
}

const getAllSuppressionListItems = async ({
  NextToken = null,
  suppressionListItems = [],
}: IGetAllSuppresionListItemsParams): Promise<aws.SESV2.SuppressedDestinationSummaries> => {
  const awsClient = new AwsClient();
  const suppressionListResponse = await awsClient.getSuppressedDestinations({ NextToken });
  for (const item of suppressionListResponse.SuppressedDestinationSummaries) {
    suppressionListItems.push(item);
  }
  if (suppressionListResponse?.NextToken) {
    return getAllSuppressionListItems({
      NextToken: suppressionListResponse.NextToken,
      suppressionListItems,
    });
  }
  return suppressionListItems;
};

export const exec = async () => {
  const suppressionListItems = await getAllSuppressionListItems({});
  for (const item of suppressionListItems) {
    const user = await UserModel.findOne({ 'emails.email': item.EmailAddress });
    if (user) {
      user.emails.forEach(email => {
        if (email.email !== item.EmailAddress) return;
        switch (item.Reason) {
          case 'BOUNCE':
            email.status = UserEmailStatus.Bounced;
            break;
          case 'COMPLAINT':
            email.status = UserEmailStatus.Complained;
            break;
          default:
            break;
        }
      });
      user.lastModified = dayjs().utc().toDate();
      await user.save();
    }
  }
  return suppressionListItems;
};

export const onComplete = async (_: SandboxedJob, result: any) => {
  console.log(`${JobNames.UpdateBouncedEmails} finished: \n ${JSON.stringify(result)}`);
};
