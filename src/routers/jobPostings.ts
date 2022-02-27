import { Express, Router } from 'express';
import * as JobController from '../controllers/jobPostings';
import protectedRequirements from '../middleware/protected';
import { UserRoles } from '../lib/constants';

const router = Router();

router.route('/:id')
  .get(JobController.getJobPostingById)
  .put(protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.updateJobPosting);

router.route('/')
  .get(JobController.getJobPostings)
  .post(protectedRequirements({ roles: [UserRoles.SuperAdmin] }), JobController.createJobPosting);

export default (app: Express) => app.use('/job-postings', router);
