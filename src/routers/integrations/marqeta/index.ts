import { Router } from 'express';
import userRouter from './user';
import cardRouter from './card';
import gpaRouter from './gpa';
import kycRouter from './kyc';
import depositAccRouter from './depositAccount';
// import authenticate from '../../middleware/authenticate';

const marqetaRouter = Router();

marqetaRouter.use('/user', userRouter);
marqetaRouter.use('/card', cardRouter);
marqetaRouter.use('/gpa', gpaRouter);
marqetaRouter.use('/kyc', kycRouter);
marqetaRouter.use('/deposit', depositAccRouter);

export default marqetaRouter;
