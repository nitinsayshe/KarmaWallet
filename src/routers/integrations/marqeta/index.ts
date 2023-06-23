import { Router } from 'express';
import userRouter from './user';
import cardRouter from './card';
import gpaRouter from './gpa';
import kycRouter from './kyc';
// import authenticate from '../../middleware/authenticate';

const marqetaRouter = Router();

marqetaRouter.use('/user', userRouter);
marqetaRouter.use('/card', cardRouter);
marqetaRouter.use('/gpa', gpaRouter);
marqetaRouter.use('/kyc', kycRouter);

export default marqetaRouter;
