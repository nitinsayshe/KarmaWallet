import { Express, Router } from 'express';
import * as PromoController from '../controllers/promo';

const router = Router();

router.get('/', PromoController.getPromos);

export default (app: Express) => app.use('/promo', router);
