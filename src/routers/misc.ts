import { Express, Router } from 'express';
import * as MiscController from '../controllers/misc';

const router = Router();

router.route('/app-version')
  .get(MiscController.getAppVersion);

export default (app: Express) => app.use('/misc', router);
