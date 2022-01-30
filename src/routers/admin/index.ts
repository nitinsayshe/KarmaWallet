import { Express, Router } from 'express';
import usersRouter from './users';

const adminRouter = Router();

adminRouter.use('/users', usersRouter);

export default (app: Express) => app.use('/admin', adminRouter);
