import 'dotenv/config';
import { Types } from 'mongoose';
import fs from 'fs';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import * as EmailService from '../src/services/email';

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    const welcomeCC1 = await EmailService.sendWelcomeCC1Email({
      name: 'John',
      domain: 'https://ui.staging.karmawallet.io',
      user: new Types.ObjectId('62192d3af022c9e3fbfe3c23'),
      recipientEmail: 'john@theimpactkarma.com',
      sendEmail: false,
    });

    const welcomeCCG1 = await EmailService.sendWelcomeCCG1Email({
      name: 'John',
      groupName: 'Testing123',
      domain: 'https://ui.staging.karmawallet.io',
      user: new Types.ObjectId('62192d3af022c9e3fbfe3c23'),
      recipientEmail: 'john@theimpactkarma.com',
      sendEmail: false,
    });

    fs.writeFileSync('./welcomeCC1.html', welcomeCC1.jobData.template);
    fs.writeFileSync('./welcomeCCG1.html', welcomeCCG1.jobData.template);

    // add mappers here...
    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
