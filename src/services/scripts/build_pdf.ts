/* eslint-disable camelcase */
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { UserModel } from '../../models/user';

export const generatePdf = async () => {
  const user = await UserModel.findById('62f6761cf5e3ffdae60ef249');
  const { first_name, last_name, address1, address2, postal_code, city, userToken } = user.integrations.marqeta;
  const fullName = `${first_name} ${last_name}`;
  const address = `${address1} ${address2 || ''} ${postal_code} ${city}`;
  const doc = new PDFDocument();
  const invoiceName = 'test_pdf.pdf';
  const invoicePath = path.resolve(__dirname, '.tmp', invoiceName);
  const filepath = doc.pipe(fs.createWriteStream(invoicePath));
  const logoPath = path.resolve(__dirname, 'images', 'logo-white.png');
  const headerText = `${fullName}`;
  doc
    .fontSize(25)
    .text(headerText, 100, 100);

  doc.image(logoPath, {
    fit: [250, 300],
    align: 'center',
    valign: 'center',
  });

  doc.end();

  console.log('////// this is the new pdf file path', doc);
};
