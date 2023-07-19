import { Response } from 'express';
import { ITagsFrontEndTemplateData, ITitleFrontEndTemplateData, buildContent, buildTemplate, sendDefaultHtml, sendHtml } from '../../../services/frontend_output';
import { IRequest } from '../../../types/request';
import { CompanyModel, ICompanyDocument } from '../../../models/company';
import { FrontendTemplates, OpenGraphTypes } from '../../../lib/constants';

export interface ICompareCompanyRequestQuery extends IRequest {
  company1?: string;
  company2?: string;
}

export const compareCompanies = async (req: IRequest<{}, ICompareCompanyRequestQuery>, res: Response) => {
  const { company1, company2 } = req.query;

  let _company1: ICompanyDocument;
  let _company2: ICompanyDocument;

  let description = 'Discover the truth about the brands you love. Compare 15,000+ Company Report Cards on Karma Wallet to see how your top brands stack up. ';
  let title = 'Compare Karma Wallet Company Report Cards';
  let image = 'https://s3.amazonaws.com/assets.karmawallet/kw_logo.png';
  let altText = 'Karma Wallet logo';
  let url = `${process.env.FRONTEND_DOMAIN}/compare-companies`;

  try {
    if (company1) _company1 = await CompanyModel.findOne({ _id: company1 });
    if (company2) _company2 = await CompanyModel.findOne({ _id: company2 });

    if (_company1 && _company2) {
      description = `Is ${_company1.companyName} or ${_company2.companyName} more sustainable? Compare their Company Report Cards on Karma Wallet to get the truth.`;
      title = `Compare ${_company1.companyName}'s and ${_company2.companyName}'s Report Cards on Karma Wallet`;
      image = _company1.logo;
      altText = `${_company1.companyName}'s logo`;
      url = `${process.env.FRONTEND_DOMAIN}/compare-companies?company1=${_company1._id}&company2=${_company2._id}`;
    }

    if (_company1 && !_company2) {
      description = `Is ${_company1.companyName} more sustainable than their competitors? Compare Company Report Cards on Karma Wallet to get the truth.`;
      title = `Compare ${_company1.companyName}'s Report Card on Karma Wallet`;
      image = _company1.logo;
      altText = `${_company1.companyName}'s logo`;
      url = `${process.env.FRONTEND_DOMAIN}/compare-companies?company1=${_company1._id}`;
    }

    // Data to be used for the Open Graph (i.e. social share tags)
    const tagsTemplateData: ITagsFrontEndTemplateData = {
      type: OpenGraphTypes.Article,
      url,
      description,
      title,
      image,
      siteName: 'Karma Wallet',
      twitterCard: 'summary',
      altText,
    };

    // Data to be used for the title tags
    const titleTemplateData: ITitleFrontEndTemplateData = {
      karmaWallet: 'Karma Wallet',
      image,
      title,
      description,
    };

    const tagsTemplate = buildTemplate({ data: tagsTemplateData, templateName: FrontendTemplates.OpenGraph });
    const titleTemplate = buildTemplate({ data: titleTemplateData, templateName: FrontendTemplates.Title });

    const template = tagsTemplate + titleTemplate;

    const content = buildContent({ replacement: template });
    sendHtml(req, res, content);
  } catch (e) {
    return sendDefaultHtml(req, res);
  }
};
