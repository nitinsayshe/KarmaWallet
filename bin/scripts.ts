/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { UserGroupModel } from '../src/models/userGroup';

dayjs.extend(utc);

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);

    await MongoClient.init();
    const existingGroupUsers = await UserGroupModel
      .findOne({ group: '640f2767a659f141fb9b95b0', user: '62f6761cf5e3ffdae60ef249' });

    console.log(existingGroupUsers);
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
    // await MongoClient.disconnect();
  }
})();
