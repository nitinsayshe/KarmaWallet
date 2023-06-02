import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import * as ArticleTemplatesService from '../../services/articleTemplate';

export const getAllArticleTemplates: IRequestHandler = async (req, res) => {
  try {
    const articleTemplates = await ArticleTemplatesService.getArticleTemplates(req);
    const _articleTemplates = articleTemplates.map((articleTemplate: any) => {
      const _template = articleTemplate.toObject();

      return _template;
    });
    api(req, res, _articleTemplates);
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
