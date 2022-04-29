import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { SectorModel } from '../src/models/sector';
import { CompanyModel } from '../src/models/company';

dayjs.extend(utc);

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: {},
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();

    // add mappers here...
    const sectors = await SectorModel.find({ tier: 1 });

    for (const sector of sectors) {
      const companies = await CompanyModel.find({ 'sectors.sector': sector._id });

      console.log(`${sector.name} --- ${companies.length}`);
    }

    await MongoClient.disconnect();
  } catch (err) {
    console.log('\n[-] something went wrong during the migration!');
    Logger.error(asCustomError(err));
    await MongoClient.disconnect();
  }
})();
