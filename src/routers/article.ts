import { Express, Router } from 'express';
import * as ArticleController from '../controllers/article';

const router = Router();

router.get('/all', ArticleController.getAllArticles);
router.get('/:articleId', ArticleController.getArticleById);
router.get('/', ArticleController.getRandomArticle);

export default (app: Express) => app.use('/article', router);
