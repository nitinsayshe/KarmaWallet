import path from 'path';
import fs from 'fs';
import os from 'os';
import Handlebars from 'handlebars';
import { Response } from 'express-serve-static-core';
import { registerHandlebarsOperators } from '../lib/registerHandlebarsOperators';
import CustomError from '../lib/customError';
import { ErrorTypes, FrontendTemplates, OpenGraphTypes } from '../lib/constants';
import { IRequest } from '../types/request';
import { MiscModel } from '../models/misc';

const { FRONT_END_BUILD_PATH, NODE_ENV } = process.env;

const homePath = NODE_ENV === 'production' ? path.join(os.homedir(), ...FRONT_END_BUILD_PATH.split(',')) : FRONT_END_BUILD_PATH;

const indexPath = path.join(homePath, 'index.html');
const defaultStringToReplace = '<meta name="template">';

registerHandlebarsOperators(Handlebars);

export interface ITagsFrontEndTemplateData {
  type: OpenGraphTypes;
  url: string;
  description: string;
  title: string;
  image: string;
  siteName: string;
  twitterCard?: string;
  altText: string;
}

export interface ITitleFrontEndTemplateData {
  karmaWallet: string;
  image: string;
  title: string;
  description: string;
}

export interface IBuildTemplate {
  data: ITagsFrontEndTemplateData | ITitleFrontEndTemplateData;
  templatePath?: string;
  templateName?: FrontendTemplates;
}

export interface IBuildContent {
  filepath?: string;
  stringToReplace?: string;
  replacement: string;
}

export const buildTemplate = ({
  data,
  templatePath,
  templateName = FrontendTemplates.OpenGraph,
}: IBuildTemplate) => {
  console.log({ templatePath, templateName, data });
  const _templatePath = templatePath || path.join(__dirname, '..', 'templates', 'frontend', templateName, 'template.hbs');
  console.log({ _templatePath });
  if (!fs.existsSync(_templatePath)) {
    console.log('template not found');
    throw new CustomError('Template not found', ErrorTypes.INVALID_ARG);
  }
  const templateString = fs.readFileSync(_templatePath, 'utf8');
  const template = Handlebars.compile(templateString);
  return template(data);
};

export const buildContent = ({
  filepath = indexPath,
  stringToReplace = defaultStringToReplace,
  replacement,
}: IBuildContent) => {
  const fileString = fs.readFileSync(filepath, 'utf8');
  const regex = new RegExp(stringToReplace, 'g');
  const content = fileString.replace(regex, replacement);
  return content;
};

export const sendHtml = (req: IRequest, res: Response, content: string) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(content);
};

// default tags should be stored in the DB Misc collection for updating purposes
// but a fallback is needed in case the default tags are not found
export const DEFAULT_FRONTEND_TAGS_KEY = 'default-frontend-tags';

const fallbackDefaultTags = '<meta property=\'og:title\' content=\'Karma Wallet\' data-react-helmet=\'true\'><meta property=\'og:image\' content=\'https://s3.amazonaws.com/assets.karmawallet/kw_logo.png\' data-react-helmet=\'true\'><meta property=\'og:description\' name=\'description\' content=\'Live your values. Karma Wallet\'s free personal finance platform gives you the tools to live a sustainable lifestyle. Understand your impact and earn cashback.\' data-react-helmet=\'true\'><meta name=\'twitter:card\' content=\'summary\'>';

interface IReplacement {
  value: string;
  key: string;
}

export const sendDefaultHtml = async (req: IRequest, res: Response) => {
  let replacement = await MiscModel.findOne({ key: DEFAULT_FRONTEND_TAGS_KEY }).lean() as IReplacement;
  if (!replacement) {
    replacement = {
      value: fallbackDefaultTags,
      key: DEFAULT_FRONTEND_TAGS_KEY,
    };
  }

  const content = buildContent({
    replacement: replacement.value,
  });

  res.setHeader('Content-Type', 'text/html');
  sendHtml(req, res, content);
};

export const sendIndex = (_req: IRequest, res: Response) => {
  res.sendFile(indexPath);
};
