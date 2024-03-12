import { Router } from 'express';
import userRouter from './user';
import cardRouter from './card';
import gpaRouter from './gpa';
import kycRouter from './kyc';
import depositAccRouter from './depositAccount';
import achGroupRouter from './accountGroupHolder';
import achRouter from './accountFundingSource';
import pinRouter from './pin';
import transactionRouter from './transactions';
import cardProductRouter from './cardProducts';
import digitalWalletManagementRouter from './digitalWalletmanagement';
// import authenticate from '../../middleware/authenticate';

const marqetaRouter = Router();

marqetaRouter.use('/user', userRouter);
marqetaRouter.use('/card', cardRouter);
marqetaRouter.use('/gpa', gpaRouter);
marqetaRouter.use('/kyc', kycRouter);
marqetaRouter.use('/deposit', depositAccRouter);
marqetaRouter.use('/achgroup', achGroupRouter);
marqetaRouter.use('/ach', achRouter);
marqetaRouter.use('/pin', pinRouter);
marqetaRouter.use('/transaction', transactionRouter);
marqetaRouter.use('/cardproduct', cardProductRouter);
marqetaRouter.use('/digital-wallet', digitalWalletManagementRouter);
export default marqetaRouter;
