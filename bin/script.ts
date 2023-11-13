import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { createNotifications } from '../src/services/scripts/create_notifications';

(async () => {
  try {
    await MongoClient.init();
    await createNotifications();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
  } finally {
    MongoClient.disconnect();
  }
})();
