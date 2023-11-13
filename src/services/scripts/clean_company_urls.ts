import axios from 'axios';
import path from 'path';
import { parse } from 'json2csv';
import fs from 'fs';
import { CompanyModel } from '../../models/company';

export const removeTrailingSlash = (url: string) => {
  let newUrl = url;
  if (newUrl.endsWith('/')) newUrl = newUrl.slice(0, -1);

  return newUrl;
};

export const getProtocol = async (url: string) => {
  const res = await axios.get(`https://${url}`);
  if (res.status === 200) return 'https';
  return 'http';
};

export const addProtocolToUrls = async () => {
  const companies = await CompanyModel.find({
    url: { $ne: null },
    'hidden.status': false,
  });
  let count = 0;
  let updated = 0;
  const errorUrls = [];
  for (const company of companies) {
    count++;
    if (!company?.url || company.url === null || company.url === 'null') continue;
    if (company.url.includes('http')) {
      console.log(`[+] SKIPPING (${count}/${companies.length}): ${company.url}`);
      continue;
    }
    console.log(`[+] CHECKING PROTOCOL (${count}/${companies.length}): ${company.url}`);
    try {
      const protocol = await getProtocol(company.url);
      const newUrl = `${protocol}://${company.url}`;
      company.url = newUrl;
      await company.save();
      updated++;
      console.log(`Updated ${company.companyName}`);
    } catch (err: any) {
      errorUrls.push({
        companyName: company.companyName,
        url: company.url,
      });
      console.log(`[+] ERROR updating URL for ${company.companyName}`);
    }
  }
  const _csv = parse(errorUrls);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'company_url_errors.csv'), _csv);
  console.log(`[+] Update ${updated} URLs`);
};
