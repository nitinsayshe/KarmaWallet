import { Router } from 'express';
import * as RareController from '../../controllers/integrations/rare';

const router = Router();

router.route('/project')
  .get(RareController.getProjects);

export default router;
