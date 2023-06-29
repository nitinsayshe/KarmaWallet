import { ArticleTemplateModel } from '../../models/articleTemplate';
import { IRequest } from '../../types/request';

export const getArticleTemplates = async (_req: IRequest) => ArticleTemplateModel.find({});
