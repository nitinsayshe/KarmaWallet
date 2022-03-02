import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

export enum EmailTemplates {
  GroupVerification = 'groupVerification',
}

export const buildTemplate = (templateName: string, data: any) => {
  const templatePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'template.hbs');
  const stylePath = path.join(__dirname, '..', '..', 'templates', 'email', templateName, 'style.css');
  const templateString = fs.readFileSync(templatePath, 'utf8');
  if (fs.existsSync(stylePath)) {
    data.style = fs.readFileSync(stylePath, 'utf8');
  }
  const template = Handlebars.compile(templateString);
  return template(data);
};

interface IGroupVerificationTemplateParams {
  username: string;
  domain: string;
  token: string;
  groupName: string;
}

export const sendGroupVerificationEmail = async ({
  username, domain, token, groupName,
}: IGroupVerificationTemplateParams) => {
  const verificationLink = `${domain}/account?verifyGroupEmail=${token}`;
  const template = buildTemplate(EmailTemplates.GroupVerification, {
    verificationLink, username, token, groupName,
  });
  return template;
};
