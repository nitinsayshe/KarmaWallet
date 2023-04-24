import { Express, Router } from 'express';
import companiesRouter from './companies';
import transactionRouter from './transaction';

const apiRouter = Router();

apiRouter.use('/companies', companiesRouter);
apiRouter.use('/transaction', transactionRouter);

export default (app: Express) => app.use('/api', apiRouter);
