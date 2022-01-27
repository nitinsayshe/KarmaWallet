import { Express, Router } from 'express';
import * as JobController from '../controllers/jobs';
import protectedRequirements from '../middleware/protected';
import { UserRoles } from '../lib/constants';

const router = Router();

router.route('/:id')
  .get(JobController.getJobById)
  .put(protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.updateJob);

router.route('/')
  .get(JobController.getJobs)
  .post(protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.createJob);

export default (app: Express) => app.use('/jobs', router);
