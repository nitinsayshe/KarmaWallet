import { Express, Router } from 'express';
import * as SectorsController from '../controllers/sectors';

const router = Router();

router.route('/browse-by')
  .get(SectorsController.getBrowseBySectors);

export default (app: Express) => app.use('/sectors', router);
