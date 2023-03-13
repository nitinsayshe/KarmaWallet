import { Express, Router } from 'express';
import companiesRouter from './companies';

const apiRouter = Router();

apiRouter.use('/companies', companiesRouter);

export default (app: Express) => app.use('/api', apiRouter);
