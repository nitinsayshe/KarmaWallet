import { Express, Router } from 'express';
import * as ArticleTemplatesController from '../../controllers/admin/articleTemplates';

const router = Router();

router.get('/all', ArticleTemplatesController.getAllArticleTemplates);

export default (app: Express) => app.use('/articles', router);
