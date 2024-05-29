import { Router } from 'express';
import productRouter from './product';

const stripeRouter = Router();

stripeRouter.use('/product', productRouter);

export default stripeRouter;
