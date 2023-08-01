import { Router } from 'express';
import userRouter from './user';
import cardRouter from './card';
import gpaRouter from './gpa';
import kycRouter from './kyc';
import depositAccRouter from './depositAccount';
import achGroupRouter from './accountGroupHolder';
import achFundingRouter from './accountFundingSource';
import pinRouter from './pin';
import transactionRouter from './transactions';

// import authenticate from '../../middleware/authenticate';

const marqetaRouter = Router();

marqetaRouter.use('/user', userRouter);
marqetaRouter.use('/card', cardRouter);
marqetaRouter.use('/gpa', gpaRouter);
marqetaRouter.use('/kyc', kycRouter);
marqetaRouter.use('/deposit', depositAccRouter);
marqetaRouter.use('/achgroup', achGroupRouter);
marqetaRouter.use('/fundingsource', achFundingRouter);
marqetaRouter.use('/pin', pinRouter);
marqetaRouter.use('/transaction', transactionRouter);

export default marqetaRouter;
