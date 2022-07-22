import csvtojson from 'csvtojson';
import axios, { AxiosResponse } from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ObjectId } from 'mongoose';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import { ISectorDocument, SectorModel } from '../models/sector';
import { CompanyModel, ICompanyDocument, ICompanySector } from '../models/company';
import { JobReportStatus } from '../models/jobReport';
import { IUpdateJobReportData, updateJobReport } from '../services/jobReport/utils';
import { getImageFileExtensionFromMimeType } from '../services/upload';
import { AwsClient } from '../clients/aws';

dayjs.extend(utc);

interface ICreateBatchCompaniesData {
  fileUrl: string;
  jobReportId: string;
}

interface IRawCompany {
  companyName: string;
  updateExisting: string;
  existingCompanyIdToUpdate: string;
  url: string;
  logo: string;
  hiddenStatus: string;
  hiddenReason: string;
  notes: string;
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  quinary: string;
  senary: string;
}

interface IAltSector {
  name: string;
  _id: string;
}

interface IConfig {
  jobReportId: string;
  rawData: IRawCompany[];
  companies: ICompanyDocument[];
  sectors: ISectorDocument[];
  altEnvSectors: IAltSector[];
}

const requiredFields: (keyof IRawCompany)[] = [
  'companyName',
  'primary',
];

const allowedFields: (keyof IRawCompany)[] = [
  ...requiredFields,
  'updateExisting',
  'existingCompanyIdToUpdate',
  'url',
  'logo',
  'hiddenStatus',
  'hiddenReason',
  'notes',
  'primary',
  'secondary',
  'tertiary',
  'quaternary',
  'quinary',
  'senary',
];

const imgFileExtensions = ['png', 'jpeg', 'svg+xml', 'jpg', 'webp'];

const _altEnvSectors: IAltSector[] = [{ name: 'Clothing', _id: '621b9ada5f87e75f53666f3a' }, { name: 'Casual wear', _id: '621b9ada5f87e75f53666f3e' }, { name: "Children's Clothing", _id: '621b9ada5f87e75f53666f40' }, { name: 'Household Goods & Apparel', _id: '621b9adb5f87e75f53667006' }, { name: 'Jewelry & Other Accessories', _id: '621b9ada5f87e75f53666f46' }, { name: 'Loungewear & Lingerie', _id: '621b9ada5f87e75f53666f42' }, { name: 'Activewear & Outerwear', _id: '621b9ada5f87e75f53666f3c' }, { name: 'Athletic Shoes', _id: '621b9ada5f87e75f53666f50' }, { name: 'Jewelry', _id: '621b9ada5f87e75f53666f48' }, { name: 'Health & Fitness', _id: '621b9adb5f87e75f5366705a' }, { name: 'Luggage & Handbags', _id: '621b9ada5f87e75f53666f4a' }, { name: 'Coffee', _id: '621b9ada5f87e75f53666fae' }, { name: 'Home Decor', _id: '621b9adb5f87e75f53666fe8' }, { name: 'Apparel Stores', _id: '621b9adb5f87e75f53667054' }, { name: 'Wholesalers', _id: '621b9adb5f87e75f53667072' }, { name: 'Retail', _id: '621b9adb5f87e75f53667046' }, { name: 'Nonprofits', _id: '621b9adb5f87e75f5366702e' }, { name: 'Socks', _id: '621b9ada5f87e75f53666f4c' }, { name: 'Office Supplies & Stationary Stores', _id: '621b9adb5f87e75f53667068' }, { name: 'Gift, Novelty & Souvenier Stores', _id: '621b9adb5f87e75f53667066' }, { name: 'Chocolate', _id: '621b9ada5f87e75f53666fc4' }, { name: 'Cafes', _id: '621b9ada5f87e75f53666f86' }, { name: 'Kitchen Supplies', _id: '621b9adb5f87e75f53666fee' }, { name: 'Candles', _id: '621b9adb5f87e75f53666fea' }, { name: 'Perfume', _id: '621b9adb5f87e75f5366703a' }, { name: 'Condiments', _id: '621b9ada5f87e75f53666fc6' }, { name: 'Luxury Fashion', _id: '621b9ada5f87e75f53666f44' }, { name: 'Pet & Pet Supply stores', _id: '621b9adb5f87e75f5366706c' }, { name: 'Tea', _id: '621b9ada5f87e75f53666fb6' }, { name: 'Food', _id: '621b9ada5f87e75f53666fc2' }, { name: 'Kids & Infant Stores', _id: '621b9adb5f87e75f5366705e' }, { name: 'Soap & Bath Products', _id: '621b9adb5f87e75f5366703e' }, { name: 'Furniture Stores', _id: '621b9adb5f87e75f53666fe4' }, { name: 'Feminine Hygiene', _id: '621b9adb5f87e75f53667034' }, { name: 'Bedding', _id: '621b9adb5f87e75f53666fe0' }, { name: 'Supermarkets & Grocery Stores', _id: '621b9adb5f87e75f53667070' }, { name: 'Zero Waste Products', _id: '621b9adb5f87e75f53667076' }, { name: 'Architecture, Engineering & Design', _id: '621b9adb5f87e75f53667092' }, { name: 'Construction', _id: '621b9adb5f87e75f53667090' }, { name: 'Beverage', _id: '621b9ada5f87e75f53666fac' }, { name: 'Sports & Outdoors', _id: '621b9adb5f87e75f5366706e' }, { name: 'Electronics, Gadgets & Accessories', _id: '621b9adb5f87e75f53667058' }, { name: 'Shoes', _id: '621b9ada5f87e75f53666f4e' }, { name: 'Skincare', _id: '621b9adb5f87e75f5366703c' }, { name: 'Hair care', _id: '621b9adb5f87e75f53667036' }, { name: 'Casual Shoes', _id: '621b9ada5f87e75f53666f52' }, { name: 'Cleaning Supplies', _id: '621b9adb5f87e75f53666fe2' }, { name: 'Cleaning Services', _id: '621b9adb5f87e75f5366708a' }, { name: 'Cosmetics, Beauty Supplies & Personal Care', _id: '621b9adb5f87e75f53667056' }, { name: 'Personal Care', _id: '621b9adb5f87e75f53667030' }, { name: 'Vitamins & Supplements', _id: '621b9adb5f87e75f5366705c' }, { name: 'Advertising and Public Relations', _id: '621b9adb5f87e75f5366707a' }, { name: 'Oral care', _id: '621b9adb5f87e75f53667038' }, { name: 'Fruit, Vegetable & Crop farming', _id: '621b9ada5f87e75f53666f36' }, { name: 'Diapers, Baby Wipes & Potty Training Supplies', _id: '621b9adb5f87e75f53667060' }, { name: 'Apparel', _id: '621b9ada5f87e75f53666f38' }, { name: 'Janitorial Services', _id: '621b9adb5f87e75f5366708c' }, { name: 'Cosmetics', _id: '621b9adb5f87e75f53667032' }, { name: 'Skiing & Snowboarding', _id: '621b9ada5f87e75f53666f68' }, { name: 'Publishing', _id: '621b9adb5f87e75f5366701c' }, { name: 'Home & Garden', _id: '621b9adb5f87e75f53666fde' }, { name: 'Nursery, Lawn & Garden Stores', _id: '621b9adb5f87e75f53666ff0' }, { name: 'Real Estate Agents & Brokers', _id: '621b9adb5f87e75f53667044' }, { name: 'Tobacco & Alcohol', _id: '621b9adc5f87e75f536670c0' }, { name: 'Personal Care Products', _id: '621b9adb5f87e75f53667010' }, { name: 'Household Appliances', _id: '621b9adb5f87e75f53666fec' }, { name: 'Software', _id: '621b9adb5f87e75f536670b0' }, { name: 'Icecream & Frozen Yogurt', _id: '621b9ada5f87e75f53666fbe' }, { name: 'Meat & Poultry Products', _id: '621b9ada5f87e75f53666fca' }, { name: 'Cookies & Chips', _id: '621b9ada5f87e75f53666fc8' }, { name: 'Hardware Stores', _id: '621b9adb5f87e75f53666fe6' }, { name: 'Alcohol', _id: '621b9adc5f87e75f536670c2' }, { name: 'Automotive Parts and Accessories Stores', _id: '621b9ada5f87e75f53666f74' }, { name: 'Beer, Wine & Liquor Stores', _id: '621b9adb5f87e75f53667048' }, { name: 'Liquor', _id: '621b9adc5f87e75f536670c6' }, { name: 'Wine', _id: '621b9adc5f87e75f536670c8' }, { name: 'Office Supplies, Stationary, & Gift Stores', _id: '621b9adb5f87e75f53667064' }, { name: 'Energy Equipment & Services', _id: '621b9adb5f87e75f536670a6' }, { name: 'Beer', _id: '621b9adc5f87e75f536670c4' }, { name: 'Consulting Services', _id: '621b9adb5f87e75f536670a0' }, { name: 'Sports Drinks', _id: '621b9ada5f87e75f53666fb4' }, { name: 'Services', _id: '621b9adb5f87e75f53667078' }, { name: 'Apps', _id: '621b9adb5f87e75f536670b2' }, { name: 'Paper Products', _id: '621b9adb5f87e75f5366700e' }, { name: 'Basic Resources', _id: '621b9adb5f87e75f53666ff6' }, { name: 'Industrial Cleaning Products', _id: '621b9adb5f87e75f53667008' }, { name: 'Healthcare Services', _id: '621b9ada5f87e75f53666fd0' }, { name: 'Packaging', _id: '621b9adb5f87e75f5366700c' }, { name: 'Food & Beverage Manufacturers', _id: '621b9adb5f87e75f53667002' }, { name: 'Food & Beverage', _id: '621b9ada5f87e75f53666faa' }, { name: 'Milk', _id: '621b9ada5f87e75f53666fc0' }, { name: 'Restaurants', _id: '621b9ada5f87e75f53666f90' }, { name: 'Dairy', _id: '621b9ada5f87e75f53666fba' }, { name: 'Cheese', _id: '621b9ada5f87e75f53666fbc' }, { name: 'Catering Services', _id: '621b9adb5f87e75f53667086' }, { name: 'Environmental Innovation', _id: '621b9adb5f87e75f53667000' }, { name: 'Bakeries', _id: '621b9ada5f87e75f53666f84' }, { name: 'Pharmacy', _id: '621b9adb5f87e75f53667050' }, { name: 'Colleges, Universities & Schools', _id: '621b9ada5f87e75f53666f94' }, { name: 'Accommodations', _id: '621b9adc5f87e75f536670ce' }, { name: 'Midscale', _id: '621b9adc5f87e75f536670da' }, { name: 'Gas Stations', _id: '621b9adb5f87e75f5366702a' }, { name: 'Peanut Butter', _id: '621b9ada5f87e75f53666fcc' }, { name: 'Bread & Breakfast Inns', _id: '621b9adc5f87e75f536670d0' }, { name: 'Real Estate & Renting', _id: '621b9adb5f87e75f53667042' }, { name: 'Toy Stores', _id: '621b9adb5f87e75f53667062' }, { name: 'Media & Entertainment', _id: '621b9adb5f87e75f53667018' }, { name: 'Landscaping', _id: '621b9adb5f87e75f5366709c' }, { name: 'Insurance Carriers', _id: '621b9ada5f87e75f53666f9e' }, { name: 'Legal Services', _id: '621b9adb5f87e75f536670aa' }, { name: 'Social Services', _id: '621b9ada5f87e75f53666fd8' }, { name: 'Transportation Services', _id: '621b9adc5f87e75f536670de' }, { name: 'Luxury Shoes', _id: '621b9ada5f87e75f53666f56' }, { name: 'New Car Dealers', _id: '621b9ada5f87e75f53666f6e' }, { name: 'Travel Services', _id: '621b9adc5f87e75f536670ee' }, { name: 'Advertising', _id: '621b9adb5f87e75f5366707c' }, { name: 'Kombucha', _id: '621b9ada5f87e75f53666fb0' }, { name: 'Media', _id: '621b9adb5f87e75f53667022' }, { name: 'Photography', _id: '621b9adb5f87e75f53667084' }, { name: 'Pizza chains', _id: '621b9ada5f87e75f53666f8e' }, { name: 'Art & Digital Media', _id: '621b9adb5f87e75f53667080' }, { name: 'Bookstores', _id: '621b9adb5f87e75f5366704a' }, { name: 'IT & Business Consulting', _id: '621b9adb5f87e75f536670a2' }, { name: 'Technology', _id: '621b9adb5f87e75f536670ac' }, { name: 'Electricity', _id: '621b9adc5f87e75f536670f6' }, { name: 'Business Intelligence Services', _id: '621b9adb5f87e75f536670b6' }, { name: 'Organizations & Associations', _id: '621b9adb5f87e75f5366702c' }, { name: 'News', _id: '621b9adb5f87e75f53667024' }, { name: 'Department Stores', _id: '621b9adb5f87e75f53667052' }, { name: 'Wineries', _id: '621b9ada5f87e75f53666f80' }, { name: 'Graphic Design Services', _id: '621b9adb5f87e75f53667082' }, { name: 'Excursions', _id: '621b9ada5f87e75f53666f5c' }, { name: 'Recreational Sports & Activities', _id: '621b9ada5f87e75f53666f64' }, { name: 'Hotels & Motels', _id: '621b9adc5f87e75f536670d4' }, { name: 'Financial Services', _id: '621b9ada5f87e75f53666f98' }, { name: 'Coffee Franchise', _id: '621b9ada5f87e75f53666f8a' }, { name: 'Commercial Banking', _id: '621b9ada5f87e75f53666f9a' }, { name: 'Fitness & Recreational Sports Centers', _id: '621b9ada5f87e75f53666f5e' }, { name: 'Public Relations', _id: '621b9adb5f87e75f5366707e' }, { name: 'Pharma & Biotech', _id: '621b9adb5f87e75f53667012' }, { name: 'Cloud Services', _id: '621b9adb5f87e75f536670b8' }, { name: 'Dentists', _id: '621b9ada5f87e75f53666fd2' }, { name: 'Investment Services', _id: '621b9ada5f87e75f53666fa4' }, { name: 'Paddling', _id: '621b9ada5f87e75f53666f66' }, { name: 'Educational Services', _id: '621b9ada5f87e75f53666f92' }, { name: 'Travel Agencies', _id: '621b9adc5f87e75f536670f0' }, { name: 'Tax Preparation Services', _id: '621b9ada5f87e75f53666fa8' }, { name: 'Securities, Commodity contracts, and investments', _id: '621b9ada5f87e75f53666fa0' }, { name: 'Rental Services', _id: '621b9adc5f87e75f536670e8' }, { name: 'Entertainment', _id: '621b9adb5f87e75f5366701a' }, { name: 'Healthcare', _id: '621b9adb5f87e75f53667004' }, { name: 'Automobile Dealers', _id: '621b9ada5f87e75f53666f6c' }, { name: 'Breweries', _id: '621b9ada5f87e75f53666f7e' }, { name: 'Agriculture, Forestry, Fishing and Hunting', _id: '621b9ada5f87e75f53666f32' }, { name: 'Training & Courses', _id: '621b9ada5f87e75f53666f96' }, { name: 'Arts, Entertainment & Recreation', _id: '621b9ada5f87e75f53666f58' }, { name: 'Travel', _id: '621b9adc5f87e75f536670cc' }, { name: 'Construction & Related Materials', _id: '621b9adb5f87e75f53666ffc' }, { name: 'Healthcare & Social Assistance', _id: '621b9ada5f87e75f53666fce' }, { name: 'Agencies, Brokerages, and Other Insurance Related Activities', _id: '621b9ada5f87e75f53666f9c' }, { name: 'Online Marketplaces', _id: '621b9adb5f87e75f5366706a' }, { name: "Children's Shoes", _id: '621b9ada5f87e75f53666f54' }, { name: 'Cattle Ranching & Farming', _id: '621b9ada5f87e75f53666f34' }, { name: 'Water', _id: '621b9ada5f87e75f53666fb8' }, { name: 'Manufacturing', _id: '621b9adb5f87e75f53666ff2' }, { name: 'Hamburgers & Sandwiches', _id: '621b9ada5f87e75f53666f8c' }, { name: 'Soda', _id: '621b9ada5f87e75f53666fb2' }, { name: 'Food Delivery Services', _id: '621b9adc5f87e75f536670e4' }, { name: 'Medical and Diagnostics Labs', _id: '621b9ada5f87e75f53666fd4' }, { name: 'Industrial Goods', _id: '621b9adb5f87e75f5366700a' }, { name: 'Semiconductors & Equipment', _id: '621b9adb5f87e75f53667016' }, { name: 'Telecommunications Services', _id: '621b9adc5f87e75f536670be' }, { name: 'Energy', _id: '621b9adb5f87e75f53666ffe' }, { name: 'Video Games', _id: '621b9adb5f87e75f53667020' }, { name: 'General Contractors', _id: '621b9adb5f87e75f53667096' }, { name: 'Casino Hotels', _id: '621b9adc5f87e75f536670d2' }, { name: 'Commercial Machinery', _id: '621b9adb5f87e75f53666ffa' }, { name: 'Physicians', _id: '621b9ada5f87e75f53666fd6' }, { name: 'Payment Services', _id: '621b9adb5f87e75f536670b4' }, { name: 'Used Car Dealers', _id: '621b9ada5f87e75f53666f70' }, { name: 'Social Media', _id: '621b9adb5f87e75f53667026' }, { name: 'Event Planning', _id: '621b9adb5f87e75f536670a8' }, { name: 'Independent Artists, Writers & Performers', _id: '621b9ada5f87e75f53666f60' }, { name: 'Convenience Stores', _id: '621b9adb5f87e75f5366704e' }, { name: 'Waste Management', _id: '621b9adb5f87e75f5366708e' }, { name: 'Luxury', _id: '621b9adc5f87e75f536670d8' }, { name: 'Upscale', _id: '621b9adc5f87e75f536670dc' }, { name: 'Bars', _id: '621b9ada5f87e75f53666f7c' }, { name: 'Hardware', _id: '621b9adb5f87e75f536670ae' }, { name: 'Fast Food', _id: '621b9ada5f87e75f53666f88' }, { name: 'Gas', _id: '621b9adc5f87e75f536670f8' }, { name: 'Postal Services', _id: '621b9adc5f87e75f536670e6' }, { name: 'Chemicals', _id: '621b9adb5f87e75f53666ff8' }, { name: 'Public Administration', _id: '621b9adb5f87e75f53667040' }, { name: 'Oil & Gas', _id: '621b9adb5f87e75f53667028' }, { name: 'Aerospace & Defense', _id: '621b9adb5f87e75f53666ff4' }, { name: 'Tobacco Products', _id: '621b9adc5f87e75f536670ca' }, { name: 'Telecommunications Service Providers', _id: '621b9adb5f87e75f536670ba' }, { name: 'Utilities', _id: '621b9adc5f87e75f536670f2' }, { name: 'Airlines', _id: '621b9adc5f87e75f536670e0' }, { name: 'Tire Dealers', _id: '621b9ada5f87e75f53666f76' }, { name: 'Convenience Stores & Pharmacy', _id: '621b9adb5f87e75f5366704c' }, { name: "Cafe's & Bakeries", _id: '621b9ada5f87e75f53666f82' }, { name: 'Water Providers', _id: '621b9adc5f87e75f536670fa' }, { name: 'Landscaping & Gardening Services', _id: '621b9adb5f87e75f53667098' }, { name: 'Automotive Parts, Accessories and Tire Stores', _id: '621b9ada5f87e75f53666f72' }, { name: 'Gardening', _id: '621b9adb5f87e75f5366709a' }, { name: 'Electrical Contractors', _id: '621b9adb5f87e75f53667094' }, { name: 'Commodity Contracts Brokerage', _id: '621b9ada5f87e75f53666fa2' }, { name: 'Amusement Parks & Arcades', _id: '621b9ada5f87e75f53666f5a' }, { name: 'Wholesale Clubs', _id: '621b9adb5f87e75f53667074' }, { name: 'Sanitary Paper Products', _id: '621b9adb5f87e75f53667014' }, { name: 'Museums, Historic Sites & National Parks', _id: '621b9ada5f87e75f53666f62' }];

const concatSectors = (
  sectorId: string,
  companySectors: ICompanySector[],
  sectors: ISectorDocument[],
  altEnvSectors: IAltSector[],
  uniqueSectors: Set<string>,
  isPrimary: boolean,
): [Set<string>, ICompanySector[]] => {
  const _uniqueSectors = new Set<string>(uniqueSectors);
  let _companySectors: ICompanySector[] = [...companySectors];

  if (!_uniqueSectors.has(sectorId)) {
    let sector: ISectorDocument;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === sectorId);
      sector = sectors.find(s => s.name === altEnvSector.name);
    } else {
      sector = sectors.find(s => s._id.toString() === sectorId);
    }

    _uniqueSectors.add(sectorId);
    _companySectors.push({
      sector: sector._id as ObjectId,
      primary: isPrimary,
    });

    _companySectors = [
      ..._companySectors,
      ...sector.parentSectors
        .filter(s => !_uniqueSectors.has(s.toString()))
        .map(s => {
          _uniqueSectors.add(s.toString());
          return {
            sector: s as ObjectId,
            primary: false,
          };
        }),
    ];

    _uniqueSectors.add(sectorId);
  }

  return [_uniqueSectors, _companySectors];
};

const getCompaniesAndSectors = async (jobReportId: string): Promise<[ICompanyDocument[], ISectorDocument[], IAltSector[]]> => {
  console.log('\nretrieving companies and sectors from database...');
  let companies: ICompanyDocument[];
  let sectors: ISectorDocument[];
  let altEnvSectors: IAltSector[] = [];

  try {
    companies = await CompanyModel.find({});
    sectors = await SectorModel.find({});

    if (process.env.KARMA_ENV === 'development') {
      altEnvSectors = [..._altEnvSectors];
    }
  } catch (err) {
    console.log('[-] error retrieving companies or sectors');
    console.log(err);
  }

  if (!companies.length || !sectors.length) {
    await updateJobReport(
      jobReportId,
      JobReportStatus.Failed,
      {
        message: 'Failed to retrieve existing companies or sectors from database.',
        status: JobReportStatus.Failed,
      },
    );
    return [null, null, null];
  }

  console.log('[+] companies and sectors retrieved');
  return [companies, sectors, altEnvSectors];
};

const downloadAndUploadImageFromURL = async ({ companyName, logo }: IRawCompany, company: ICompanyDocument) => {
  let response: AxiosResponse<any, any>;

  try {
    // download image from url
    response = await axios.get(logo);
  } catch (err: any) {
    return [null, `Error downloading logo for ${companyName} - ${err.message}`];
  }

  // eslint-disable-next-line prefer-destructuring
  const ext = response.headers['content-type']?.split('/')?.[1]?.split(';')[0];

  if (!ext || !imgFileExtensions.includes(ext.toLowerCase())) {
    return [null, `Unsupported image type for ${companyName} logo (${ext})`];
  }

  try {
    // upload image to S3
    const filenameSlug = `${slugify(companyName)}${getImageFileExtensionFromMimeType(response.headers['content-type'])}`;
    const imageData = {
      file: response.data,
      contentType: response.headers['content-type'],
      name: `company/${company._id}/${nanoid(10)}-${filenameSlug}`,
    };

    const client = new AwsClient();
    const { url } = await client.uploadToS3(imageData);
    return [url];
  } catch (err: any) {
    return [null, `Error uploading logo for ${companyName} to S3 - ${err.message}`];
  }
};

const getCompanySectors = (
  {
    primary,
    secondary,
    tertiary,
    quaternary,
    quinary,
    senary,
  }: IRawCompany,
  sectors: ISectorDocument[],
  altEnvSectors: IAltSector[],
) => {
  let uniqueSectors = new Set<string>();
  let companySectors: ICompanySector[] = [];

  if (!!primary) {
    const [_uniqueSectors, _companySectors] = concatSectors(primary, companySectors, sectors, altEnvSectors, uniqueSectors, true);
    uniqueSectors = _uniqueSectors;
    companySectors = _companySectors;
  }

  if (!!secondary) {
    const [_uniqueSectors, _companySectors] = concatSectors(secondary, companySectors, sectors, altEnvSectors, uniqueSectors, false);
    uniqueSectors = _uniqueSectors;
    companySectors = _companySectors;
  }

  if (!!tertiary) {
    const [_uniqueSectors, _companySectors] = concatSectors(tertiary, companySectors, sectors, altEnvSectors, uniqueSectors, false);
    uniqueSectors = _uniqueSectors;
    companySectors = _companySectors;
  }

  if (!!quaternary) {
    const [_uniqueSectors, _companySectors] = concatSectors(quaternary, companySectors, sectors, altEnvSectors, uniqueSectors, false);
    uniqueSectors = _uniqueSectors;
    companySectors = _companySectors;
  }

  if (!!quinary) {
    const [_uniqueSectors, _companySectors] = concatSectors(quinary, companySectors, sectors, altEnvSectors, uniqueSectors, false);
    uniqueSectors = _uniqueSectors;
    companySectors = _companySectors;
  }

  if (!!senary) {
    const [_uniqueSectors, _companySectors] = concatSectors(senary, companySectors, sectors, altEnvSectors, uniqueSectors, false);
    uniqueSectors = _uniqueSectors;
    companySectors = _companySectors;
  }

  return companySectors;
};

const loadRawData = async (fileUrl: string, jobReportId: string) => {
  console.log('\nretrieving raw data from file...');
  let rawData: IRawCompany[] = [];

  try {
    const res = await axios.get(fileUrl);
    rawData = await csvtojson().fromString(res.data);
  } catch (err) {
    console.log('[-] error retrieving batch company data from S3');
    console.log(err);
  }

  if (!rawData?.length) {
    await updateJobReport(
      jobReportId,
      JobReportStatus.Failed,
      {
        message: 'Failed to retrieve batch company data from S3.',
        status: JobReportStatus.Failed,
      },
    );
    return;
  }

  console.log('[+] raw data loaded');
  return rawData;
};

const validateSectors = (
  {
    primary,
    secondary,
    tertiary,
    quaternary,
    quinary,
    senary,
  }: IRawCompany,
  sectors: ISectorDocument[],
  altEnvSectors: IAltSector[],
) => {
  const invalidSectors: string[] = [];

  if (!!primary) {
    let found = false;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === primary);
      found = !!sectors.find(s => (s.name === altEnvSector.name));
    } else {
      found = !!sectors.find(s => (s._id.toString() === primary));
    }

    if (!found) invalidSectors.push(primary);
  }

  if (!!secondary) {
    let found = false;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === secondary);
      found = !!sectors.find(s => (s.name === altEnvSector.name));
    } else {
      found = !!sectors.find(s => (s._id.toString() === secondary));
    }

    if (!found) invalidSectors.push(secondary);
  }

  if (!!tertiary) {
    let found = false;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === tertiary);
      found = !!sectors.find(s => (s.name === altEnvSector.name));
    } else {
      found = !!sectors.find(s => (s._id.toString() === tertiary));
    }

    if (!found) invalidSectors.push(tertiary);
  }

  if (!!quaternary) {
    let found = false;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === quaternary);
      found = !!sectors.find(s => (s.name === altEnvSector.name));
    } else {
      found = !!sectors.find(s => (s._id.toString() === quaternary));
    }

    if (!found) invalidSectors.push(quaternary);
  }

  if (!!quinary) {
    let found = false;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === quinary);
      found = !!sectors.find(s => (s.name === altEnvSector.name));
    } else {
      found = !!sectors.find(s => (s._id.toString() === quinary));
    }

    if (!found) invalidSectors.push(quinary);
  }

  if (!!senary) {
    let found = false;

    if (altEnvSectors.length) {
      const altEnvSector = altEnvSectors.find(aes => aes._id === senary);
      found = !!sectors.find(s => (s.name === altEnvSector.name));
    } else {
      found = !!sectors.find(s => (s._id.toString() === senary));
    }

    if (!found) invalidSectors.push(senary);
  }

  return invalidSectors;
};

const validateRawData = async ({
  jobReportId,
  rawData,
  companies,
  sectors,
  altEnvSectors,
}: IConfig) => {
  console.log('\nvalidating raw data...');

  // verify allowed fields
  const invalidFields = Object.keys(rawData[0]).filter(key => !allowedFields.includes(key as keyof IRawCompany));
  if (invalidFields.length) {
    const message = `Invalid fields in batch company data found: ${invalidFields.join(', ')}`;
    console.log(`[-] ${message}`);
    await updateJobReport(jobReportId, JobReportStatus.Failed, { message, status: JobReportStatus.Failed });
    return;
  }

  // verify all required keys are included
  const missingFields: IUpdateJobReportData[] = [];

  for (let i = 0; i < rawData.length; i++) {
    for (const key of requiredFields) {
      if (!rawData[i][key]) {
        missingFields.push({
          message: `row ${i - 1} in csv is missing required field: ${key}`,
          status: JobReportStatus.Failed,
        });
      }
    }
  }

  if (!!missingFields.length) {
    for (const message of missingFields) {
      console.log(`[-] ${message.message}`);
    }

    await updateJobReport(jobReportId, JobReportStatus.Failed, missingFields);
    return;
  }

  const existingCompanies: string[] = [];
  const invalidExistingCompanyToUpdate: string[] = [];
  const invalidSectors = new Set<string>();

  for (const row of rawData) {
    // check for conflicting companies that have not been
    // set to be overwritten.
    const company = companies.find(c => {
      if (!!row.existingCompanyIdToUpdate) return c._id.toString() === row.existingCompanyIdToUpdate;
      // this assumed that the company name is unique
      // and company url are unique...this may need to be updated.
      return c.companyName === row.companyName || (!!row.url && (c.url === row.url));
    });

    if (!!company) {
      if (row.updateExisting?.toLowerCase() === 'true') {
        if (row.existingCompanyIdToUpdate !== company._id.toString()) invalidExistingCompanyToUpdate.push(row.existingCompanyIdToUpdate);
      } else {
        existingCompanies.push(row.companyName);
      }
    }

    validateSectors(row, sectors, altEnvSectors).forEach(s => invalidSectors.add(s));
  }

  if (!existingCompanies.length && !invalidSectors.size && !invalidExistingCompanyToUpdate.length) {
    console.log('[+] raw data validated');
    return true;
  }

  const messages: IUpdateJobReportData[] = [];
  if (!!existingCompanies.length) {
    messages.push({
      message: `the following compan${existingCompanies.length > 1 ? 'ies' : 'y'} already exist${existingCompanies.length > 1 ? '' : 's'}: ${existingCompanies.join(', ')}`,
      status: JobReportStatus.Failed,
    });
  }

  if (!!invalidExistingCompanyToUpdate.length) {
    messages.push({
      message: `the following existing compan${existingCompanies.length > 1 ? 'ies' : 'y'} to update ${existingCompanies.length > 1 ? 'were' : 'was'} not found: ${invalidExistingCompanyToUpdate.join(', ')}`,
      status: JobReportStatus.Failed,
    });
  }

  if (!!invalidSectors.size) {
    messages.push({
      message: `the following sector${invalidSectors.size > 1 ? 's are' : 'is'} invalid: ${[...Array.from(invalidSectors)].join(', ')}`,
      status: JobReportStatus.Failed,
    });
  }

  for (const message of messages) {
    console.log(`[-] ${message.message}`);
  }

  await updateJobReport(jobReportId, JobReportStatus.Failed, messages);
};

const createCompanies = async ({
  jobReportId,
  rawData,
  companies,
  sectors,
  altEnvSectors,
}: IConfig) => {
  console.log('\ncreating companies...');

  const failedLogoDownload: { companyName: string, error: string }[] = [];
  const reportMessages: IUpdateJobReportData[] = [];

  let count = 0;
  let errorCount = 0;
  let logoDownloadCount = 0;

  for (const row of rawData) {
    const companySectors = getCompanySectors(row, sectors, altEnvSectors);

    let company: ICompanyDocument;

    if (row.updateExisting.toLowerCase() === 'true' && !!row.existingCompanyIdToUpdate) {
      company = companies.find(c => c._id.toString() === row.existingCompanyIdToUpdate);

      if (!company) {
        const message = `existing company to update with id ${row.existingCompanyIdToUpdate} not found, so will not be updated.`;
        console.log(message);
        reportMessages.push({ message, status: JobReportStatus.Failed });
        continue;
      }

      if (row.companyName) company.companyName = row.companyName;
      if (row.url) company.url = row.url;
      if (row.hiddenStatus) {
        company.hidden = {
          status: row.hiddenStatus?.toLowerCase() === 'true',
          reason: row.hiddenReason,
          lastModified: dayjs().utc().toDate(),
        };
      }
      if (row.notes) company.notes = row.notes;
      if (!!companySectors.length) company.sectors = companySectors;

      if (!!row.logo) {
        const [logoUrl, logoError] = await downloadAndUploadImageFromURL(row, company);
        if (logoUrl) {
          logoDownloadCount += 1;
          company.logo = logoUrl;
        }

        if (logoError) {
          reportMessages.push({
            message: logoError,
            status: JobReportStatus.Failed,
          });
        }
      }

      company.lastModified = dayjs().utc().toDate();
    } else {
      company = new CompanyModel({
        companyName: row.companyName,
        url: row.url,
        hidden: {
          status: row.hiddenStatus?.toLowerCase() === 'true',
          reason: row.hiddenReason,
          lastModified: dayjs().utc().toDate(),
        },
        notes: row.notes,
        sectors: companySectors,
        createdAt: dayjs().utc().toDate(),
      });

      if (!!row.logo) {
        const [logoUrl, logoError] = await downloadAndUploadImageFromURL(row, company);
        if (logoUrl) {
          logoDownloadCount += 1;
          company.logo = logoUrl;
        }

        if (logoError) {
          reportMessages.push({
            message: logoError,
            status: JobReportStatus.Failed,
          });
        }
      }
    }

    try {
      await company.save();
      count += 1;
    } catch (err) {
      errorCount += 1;
      const message = `An error occurred while saving company: ${company.companyName}.`;
      reportMessages.push({
        message,
        status: JobReportStatus.Failed,
      });
      console.log(`[-] ${message}`);
      console.log(err);
    }
  }

  if (!!failedLogoDownload.length) {
    reportMessages.push({
      message: `${failedLogoDownload.length} logos failed to download.`,
      status: JobReportStatus.Failed,
    });
  }

  if (!!errorCount) {
    const message = `${errorCount} companies failed to save.`;
    reportMessages.push({
      message,
      status: JobReportStatus.Failed,
    });
    console.log(`[-] ${message}`);
  }

  const logoDownloadMessage = `${logoDownloadCount} logos downloaded.`;

  reportMessages.push({
    message: logoDownloadMessage,
    status: JobReportStatus.Completed,
  });

  console.log(`[+] ${logoDownloadMessage}`);

  const companiesCreatedMessage = `${count} companies created.`;

  reportMessages.push({
    message: companiesCreatedMessage,
    status: JobReportStatus.Completed,
  });

  console.log(`[+] ${companiesCreatedMessage}`);

  let finalStatus: JobReportStatus;

  if (errorCount > 0) {
    if (count > 0) {
      finalStatus = JobReportStatus.CompletedWithErrors;
    } else {
      finalStatus = JobReportStatus.Failed;
    }
  } else if (count > 0) {
    finalStatus = JobReportStatus.Completed;
  } else {
    finalStatus = JobReportStatus.Unknown;
  }

  await updateJobReport(jobReportId, finalStatus, reportMessages);
};

export const exec = async ({ fileUrl, jobReportId }: ICreateBatchCompaniesData) => {
  console.log('\ncreating new companies...\n');

  await updateJobReport(jobReportId, JobReportStatus.Processing);

  const [companies, sectors, altEnvSectors] = await getCompaniesAndSectors(jobReportId);
  if (!companies.length || !sectors.length) return;

  const rawData = await loadRawData(fileUrl, jobReportId);
  if (!rawData?.length) return;

  const config = { jobReportId, rawData, companies, sectors, altEnvSectors };

  const isValidRawData = await validateRawData(config);
  if (!isValidRawData) return;

  await createCompanies(config);
};

/**
 * changing a company's parent company
 * means needing to change the data sources a company
 * has assigned to it (inheritance)
 *
 * changing the data sources of a company
 * will require changing the company's company to data
 * source mappings.
 *
 * changing the company's company to data source mappings
 * will require changing the company's company to unsdg
 * mappings.
 *
 * changing the company's company to unsdg mappings
 * will require the company's scores to be recalculated
 */

/**
 * changing a company's sectors means that all sector
 * average scores need to be recalculated.
 */
