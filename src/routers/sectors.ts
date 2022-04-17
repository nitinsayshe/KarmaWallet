import { Express, Router } from 'express';
import * as SectorsController from '../controllers/sectors';

const router = Router();

router.route('/')
  .get(SectorsController.getSectors);

router.route('/:sectorId/children')
  .get(SectorsController.getChildSectors);

export default (app: Express) => app.use('/sectors', router);
