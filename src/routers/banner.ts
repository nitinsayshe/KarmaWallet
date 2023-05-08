import { Express, Router } from 'express';
import * as BannerController from '../controllers/banner';

const router = Router();

router.get('/', BannerController.getActiveBanners);
// see admin for company create/update/delete routes

export default (app: Express) => app.use('/banner', router);
