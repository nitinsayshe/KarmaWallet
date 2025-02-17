import { Router } from 'express';
import userRouter from './user';
import cardRouter from './card';
import gpaRouter from './gpa';
import kycRouter from './kyc';
import achGroupRouter from './accountGroupHolder';
import achRouter from './accountFundingSource';
import pinRouter from './pin';
import transactionRouter from './transactions';
import cardProductRouter from './cardProducts';
import depositAccountRouter from './depositAccount';
import digitalWalletRouter from './digitalWalletManagement';
import authenticate from '../../../middleware/authenticate';

const marqetaRouter = Router();

marqetaRouter.use('/user', userRouter);
marqetaRouter.use('/card', cardRouter);
marqetaRouter.use('/gpa', gpaRouter);
marqetaRouter.use('/kyc', kycRouter);
marqetaRouter.use('/achgroup', achGroupRouter);
marqetaRouter.use('/ach', achRouter);
marqetaRouter.use('/pin', pinRouter);
marqetaRouter.use('/transaction', transactionRouter);
marqetaRouter.use('/cardproduct', cardProductRouter);
marqetaRouter.use('/deposit-account', authenticate, depositAccountRouter);
marqetaRouter.use('/digital-wallet', authenticate, digitalWalletRouter);
export default marqetaRouter;
