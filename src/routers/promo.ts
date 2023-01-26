import { Express, Router } from 'express';
import * as PromoController from '../controllers/promo';

const router = Router();

router.get('/', PromoController.getPromos);
router.post('/createPromo', PromoController.createPromo);

export default (app: Express) => app.use('/promo', router);
