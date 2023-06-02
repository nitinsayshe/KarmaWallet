import { Express, Router } from 'express';
import * as ArticleController from '../controllers/article';

const router = Router();

router.get('/all', ArticleController.getAllArticles);
router.get('/:articleId', ArticleController.getArticleById);
router.get('/', ArticleController.getRandomArticle);
router.put('/:articleId', ArticleController.updateArticle);

export default (app: Express) => app.use('/article', router);
