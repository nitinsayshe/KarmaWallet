import aws from './client';
import { EmailAddresses } from '../../lib/constants';

aws.config.update({ region: 'us-east-1' });

const ses = new aws.SES();

interface ISendEmailRequest {
  senderEmail?: aws.SES.Address;
  recipientEmail: aws.SES.Address;
  replyToAddresses: aws.SES.AddressList;
  template: string;
  subject: string;
  senderName?: string;
}

export const sendMail = ({
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
  return ses.sendEmail(params).promise();
};

export default ses;

// https://betterprogramming.pub/how-to-send-emails-with-node-js-using-amazon-ses-8ae38f6312e4
