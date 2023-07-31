import { Response } from 'express';
import { ITagsFrontEndTemplateData, ITitleFrontEndTemplateData, buildContent, buildTemplate, sendDefaultHtml, sendHtml } from '../../../services/frontend_output';
import { IRequest } from '../../../types/request';
import { CompanyModel } from '../../../models/company';
import { FrontendTemplates, OpenGraphTypes } from '../../../lib/constants';

const { FRONTEND_DOMAIN } = process.env;

export interface IGetCompanyByIdRequestParams extends IRequest {
  companyId: string;
}

export const getCompanyById = async (req: IRequest<IGetCompanyByIdRequestParams>, res: Response) => {
  try {
    const { companyId } = req.params;
    const company = await CompanyModel.findOne({ _id: companyId });
    if (!company) return sendDefaultHtml(req, res);
    // template in DB needs to be used

    // Data to be used for the Open Graph (i.e. social share tags)
    const tagsTemplateData: ITagsFrontEndTemplateData = {
      type: OpenGraphTypes.Article,
      url: `${FRONTEND_DOMAIN}/company/${company._id}/${company.slug}`,
      description: `Discover the truth about the brands you love. Explore ${company.companyName}'s Report Card on Karma Wallet to learn about their social and environmental impact.`,
      title: `${company.companyName}'s Report Card on Karma Wallet`,
      image: company.logo,
      siteName: 'Karma Wallet',
      twitterCard: 'summary',
      altText: `${company.companyName}'s logo`,
    };

    // Data to be used for the title tags
    const titleTemplateData: ITitleFrontEndTemplateData = {
      karmaWallet: 'Karma Wallet',
      image: company.logo,
      title: `${company.companyName}'s Report Card on Karma Wallet`,
      description: `Discover the truth about the brands you love. Explore ${company.companyName}'s Report Card on Karma Wallet to learn about their social and environmental impact.`,
    };

    // Build templates for tags and title
    const tagsTemplate = buildTemplate({ data: tagsTemplateData, templateName: FrontendTemplates.OpenGraph });
    const titleTemplate = buildTemplate({ data: titleTemplateData, templateName: FrontendTemplates.Title });

    // Combine templates
    const template = tagsTemplate + titleTemplate;

    // replate string in index.html with template
    const content = buildContent({ replacement: template });

    sendHtml(req, res, content);
  } catch (e) {
    return sendDefaultHtml(req, res);
  }
};
