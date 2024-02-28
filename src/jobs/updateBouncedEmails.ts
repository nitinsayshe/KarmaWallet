import { SandboxedJob } from 'bullmq';
import aws from 'aws-sdk';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AwsClient } from '../clients/aws';
import { JobNames } from '../lib/constants/jobScheduler';
import { UserModel } from '../models/user';
import { VisitorModel } from '../models/visitor';
import { UserEmailStatus } from '../models/user/types';

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
  const suppressionListResponse = await awsClient.getSuppressedDestinations({ NextToken, PageSize: 1000 });
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
    const visitor = await VisitorModel.findOne({ email: item.EmailAddress });

    if (user) {
      let userHasBeenUpdated = false;
      user.emails.forEach(email => {
        if (email.email !== item.EmailAddress) return;
        switch (item.Reason) {
          case 'BOUNCE':
            if (email.status === UserEmailStatus.Bounced) return;
            email.status = UserEmailStatus.Bounced;
            email.bouncedDate = dayjs().utc().toDate();
            userHasBeenUpdated = true;
            break;
          case 'COMPLAINT':
            if (email.status === UserEmailStatus.Complained) return;
            email.status = UserEmailStatus.Complained;
            userHasBeenUpdated = true;
            break;
          default:
            break;
        }
      });
      if (userHasBeenUpdated) {
        user.lastModified = dayjs().utc().toDate();
        await user.save();
      }
    }

    if (visitor) {
      let visitorHasBeenUpdated = false;
      switch (item.Reason) {
        case 'BOUNCE':
          if (visitor.emailStatus === UserEmailStatus.Bounced) return;
          visitor.emailStatus = UserEmailStatus.Bounced;
          visitorHasBeenUpdated = true;
          break;
        case 'COMPLAINT':
          if (visitor.emailStatus === UserEmailStatus.Complained) return;
          visitor.emailStatus = UserEmailStatus.Complained;
          visitorHasBeenUpdated = true;
          break;
        default:
          break;
      }

      if (visitorHasBeenUpdated) {
        visitor.statusLastModified = dayjs().utc().toDate();
        await visitor.save();
      }
    }
  }
  return `${suppressionListItems.length} emails have been updated`;
};

export const onComplete = async (_: SandboxedJob, result: any) => {
  console.log(`${JobNames.UpdateBouncedEmails} finished: \n ${JSON.stringify(result)}`);
};
