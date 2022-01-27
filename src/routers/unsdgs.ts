import { Express, Router } from 'express';
import * as UnsdgController from '../controllers/unsdgs';

const router = Router();

router.route('/')
  .get(UnsdgController.getUnsdgs);

export default (app: Express) => app.use('/unsdgs', router);
