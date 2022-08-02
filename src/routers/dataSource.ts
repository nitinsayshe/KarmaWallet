import { Express, Router } from 'express';
import * as DataSourceController from '../controllers/dataSource';

const router = Router();

router.route('/')
  .get(DataSourceController.getDataSources);

export default (app: Express) => app.use('/data-source', router);
