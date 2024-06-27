import { Router } from 'express';
import productRouter from './product';
import priceRouter from './price';

const stripeRouter = Router();

stripeRouter.use('/product', productRouter);
stripeRouter.use('/price', priceRouter);

export default stripeRouter;
