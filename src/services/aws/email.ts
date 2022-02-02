import aws from './client';
import { EmailAddresses } from '../../lib/constants';

aws.config.update({ region: 'us-east-2' });

const ses = new aws.SES();

interface ISendEmailRequest {
  senderEmail: aws.SES.Address;
  recipientEmail: aws.SES.Address;
  username: string;
  replyToAddresses: aws.SES.AddressList;
}

/**
 * @param {string} senderEmail
 * @param {string} recipientEmail
 * @param {string} username
 * @param {string[]} replyToAddresses
 */
export const sendMail = ({
  senderEmail = EmailAddresses.NoReply,
  recipientEmail,
  username,
  replyToAddresses = [EmailAddresses.ReplyTo],
}: ISendEmailRequest) => {
  const params = {
    Source: senderEmail,
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
          Data: `<p>Hello, ${username}!</p>`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Hello, ${username}!`,
      },
    },
  };
  return ses.sendEmail(params).promise();
};

export default ses;

// https://betterprogramming.pub/how-to-send-emails-with-node-js-using-amazon-ses-8ae38f6312e4
