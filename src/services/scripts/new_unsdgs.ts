import { FilterQuery } from 'mongoose';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { CompanyUnsdgModel } from '../../models/companyUnsdg';
import { CompanyCreationStatus, CompanyModel, ICompany } from '../../models/company';
import { toUTC } from '../../lib/date';

/**
 * creates and stores the base unsdg data in the db.
 *
 * unsdg source data will be retrieved from the db
 * now instead of hard coded on the the fe.
 */

const unsdgCategories = [
  { name: 'Planet', index: 0 },
  { name: 'People', index: 1 },
];

const unsdgSubcategories = [
  {
    name: 'Sustainability',
    category: 0,
    categoryIndex: 0,
  },
  {
    name: 'Climate Action',
    category: 0,
    categoryIndex: 1,
  },
  {
    name: 'Community Welfare',
    category: 1,
    categoryIndex: 0,
  },
  {
    name: 'Diversity & Inclusion',
    category: 1,
    categoryIndex: 1,
  },
];

/**
 * subCategory 0 === Sustainability
 * subCategory 1 === Climate Action
 * subCategory 2 === Community Welfare
 * subCategory 3 === Diversity & Inclusion
 */
const rawUnsdgs = [
  {
    title: 'No Poverty',
    subCategory: 2,
    subCategoryIndex: 0,
    goalNum: 1,
    img: 'https://cdn.karmawallet.io/uploads/_qNbvPwJxQ-unsdg-1.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal1',
    description: 'End poverty in all its forms everywhere.',
    subTitle: 'Reduces Poverty',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of fair and livable wages. Evidence may take the form of fairtrade certification, median worker pay, absence of US wage and compliance violations, and wage and overtime pay increases.',
  },
  {
    title: 'Zero Hunger',
    subCategory: 2,
    subCategoryIndex: 1,
    goalNum: 2,
    img: 'https://cdn.karmawallet.io/uploads/QlYyJMiV49-unsdg-2.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal2',
    description: 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture.',
    subTitle: 'Has initiatives to increase food security',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of ongoing initiatives to increase food security. Evidence may take the form of fairtrade certification and proof of donations to organizations that support food initiatives.',
  },
  {
    title: 'Good Health and Well-Being',
    subCategory: 2,
    subCategoryIndex: 2,
    goalNum: 3,
    img: 'https://cdn.karmawallet.io/uploads/VasYgjC4yM-unsdg-3.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal3',
    description: 'Ensure healthy lives and promote well-being for all at all ages.',
    subTitle: 'Promotes a healthy lifestyle & environment',
    howToAcquire: 'To receive points towards this goal, a company must promote access to healthcare. Evidence may take the form of maternity & paternity leave policy, pollution management, benefits and work-life balance.',
  },
  {
    title: 'Quality Education',
    subCategory: 2,
    subCategoryIndex: 3,
    goalNum: 4,
    img: 'https://cdn.karmawallet.io/uploads/iRkPfLLCih-unsdg-4.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal4',
    description: 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.',
    subTitle: 'Supports equitable, affordable education',
    howToAcquire: 'To receive points towards this goal, a company must advocate for affordable education. Evidence may take the form of workforce investment and training, monetary donations to support education, or fairtrade certification.',
  },
  {
    title: 'Gender Equality',
    subCategory: 3,
    subCategoryIndex: 0,
    goalNum: 5,
    img: 'https://cdn.karmawallet.io/uploads/sAHZc45RkT-unsdg-5.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal5',
    description: 'Achieve gender equality and empower all women and girls.',
    subTitle: 'Supports gender equality',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of supporting and advocating for gender equality. Evidence may take the form of Equal pay, breakdown of leadership positions by gender, or certifications such as Women Owned Small Business, Women’s Business Enterprise, or Green America.',
  },
  {
    title: 'Clean Water and Sanitation',
    subCategory: 1,
    subCategoryIndex: 0,
    goalNum: 6,
    img: 'https://cdn.karmawallet.io/uploads/wgjIcGCGTX-unsdg-6.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal6',
    description: 'Ensure availability and sustainable management of water and sanitation for all.',
    subTitle: 'Supports sustainable water management',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of sustainable water management. Evidence may take the form of water usage measurement and reduction, certificates such as The Alliance for Water Stewardship, or 3rd Party Audits.',
  },
  {
    title: 'Affordable and Clean Energy',
    subCategory: 0,
    subCategoryIndex: 0,
    goalNum: 7,
    img: 'https://cdn.karmawallet.io/uploads/5UBbIDZm8D-unsdg-7.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal7',
    description: 'Ensure access to affordable, reliable, sustainable and modern energy for all.',
    subTitle: 'Supports affordable & clean energy',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of access to affordable and clean energy. Evidence may take the form of energy usage, percent renewable energy used and certifications such as Cradle2Cradle, GRESB & Fairtrade.',
  },
  {
    title: 'Decent Work and Economic Growth',
    subCategory: 3,
    subCategoryIndex: 1,
    goalNum: 8,
    img: 'https://cdn.karmawallet.io/uploads/RQZr74Qjwz-unsdg-8.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal8',
    description: 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.',
    subTitle: 'Focuses on inclusive, sustainable growth',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of decent working conditions and career growth opportunities. Evidence may take the form of decent wages, workplace safety policies, policies condemning forced & child labor, career development opportunities and the use of artisan workers.',
  },
  {
    title: 'Industry, Innovation and Infrastructure',
    subCategory: 0,
    subCategoryIndex: 1,
    goalNum: 9,
    img: 'https://cdn.karmawallet.io/uploads/gLDWDBaeC9-unsdg-9.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal9',
    description: 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.',
    subTitle: 'Implements sustainable infrastructure',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of the implementation of sustainable infrastructure. Evidence may take the form of 3rd Party Audits, circular production, Cradle2cradle certification and the use of smaller suppliers.',
  },
  {
    title: 'Reduced Inequalities',
    subCategory: 3,
    subCategoryIndex: 2,
    goalNum: 10,
    img: 'https://cdn.karmawallet.io/uploads/fQrSJZjSCR-unsdg-10.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal10',
    description: 'Reduce inequality within and among countries.',
    subTitle: 'Has initiatives to reduce inequality',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of ongoing initiatives to reduce inequality. Evidence may take the form of equal opportunity policies and Racial breakdown statistics.',
  },
  {
    title: 'Sustainable Cities and Communities',
    subCategory: 0,
    subCategoryIndex: 2,
    goalNum: 11,
    img: 'https://cdn.karmawallet.io/uploads/UlT-DWxipH-unsdg-11.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal11',
    description: 'Make cities and human settlements inclusive, safe, resilient and sustainable.',
    subTitle: 'Reduces urban environmental impact',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of reduction of environmental impact. Evidence may take the form of waste management policies and 3rd party audit reports.',
  },
  {
    title: 'Responsible Consumption and Production',
    subCategory: 0,
    subCategoryIndex: 3,
    goalNum: 12,
    img: 'https://cdn.karmawallet.io/uploads/DH7hFWVAlD-unsdg-12.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal12',
    description: 'Ensure sustainable consumption and production patterns.',
    subTitle: 'Supports sustainable consumption & production',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of sustainable consumption and production. Evidence may take the form of food waste reports and recycling policies.',
  },
  {
    title: 'Climate Action',
    subCategory: 1,
    subCategoryIndex: 1,
    goalNum: 13,
    img: 'https://cdn.karmawallet.io/uploads/K51f3g7AAN-unsdg-13.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal13',
    description: 'Take urgent action to combat climate change and its impacts.',
    subTitle: 'Combats climate change',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of climate change policies. Evidence may take the form of carbon emissions, purchase of carbon offsets, and certifications.',
  },
  {
    title: 'Life Below Water',
    subCategory: 1,
    subCategoryIndex: 2,
    goalNum: 14,
    img: 'https://cdn.karmawallet.io/uploads/xGb_1IFJF4-unsdg-14.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal14',
    description: 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development.',
    subTitle: 'Conserves marine resources',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of policies addressing conservation of marine resources . Evidence may take the form of sustainable fishing practices, reduction of water pollution & certifications.',
  },
  {
    title: 'Life on Land',
    subCategory: 1,
    subCategoryIndex: 3,
    goalNum: 15,
    img: 'https://cdn.karmawallet.io/uploads/VNLVFoqmfK-unsdg-15.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal15',
    description: 'Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss.',
    subTitle: 'Promotes sustainably managed ecosystems',
    howToAcquire: 'To receive points towards this goal, a company must provide evidence of support for sustainable ecosystems. Evidence may take the form of certifications, sustainable management of forests, animal protection policies, proof of donations to support the cause, and 3rd party audits.',
  },
  {
    title: 'Peace, Justice and Strong Institutions',
    subCategory: 3,
    subCategoryIndex: 3,
    goalNum: 16,
    img: 'https://cdn.karmawallet.io/uploads/kd-P3A8E-c-unsdg-16.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal16',
    description: 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels.',
    subTitle: 'Promotes increased access to justice',
    howToAcquire: 'To receive points towards this goal, a company must advocate for peace and justice. Evidence may take the form of ethical business practices & data privacy audit reports.',
  },
  {
    title: 'Partnerships for the Goals',
    subCategory: -1,
    subCategoryIndex: -1,
    goalNum: 17,
    img: 'https://cdn.karmawallet.io/uploads/ZTwtreebna-unsdg-17.png',
    sourceUrl: 'https://sdgs.un.org/goals/goal17',
    description: 'Strengthen the means of implementation and revitalize the global partnership for sustainable development.',
    subTitle: 'Not included',
    howToAcquire: 'We exclude this development goal from our grading system because it primarily focuses on the behavior of governments and NGOs.',
  },
];

const prepare = async (): Promise<[IUnsdgCategoryDocument[], IUnsdgSubcategoryDocument[], IUnsdgDocument[]]> => {
  const categories: IUnsdgCategoryDocument[] = await UnsdgCategoryModel.find();
  const subcategories: IUnsdgSubcategoryDocument[] = await UnsdgSubcategoryModel.find();
  const unsdgs: IUnsdgDocument[] = await UnsdgModel.find().sort({ goalNum: 'asc' });

  return [categories, subcategories, unsdgs];
};

const createCategories = async () => {
  console.log('creating unsdg_categories...');
  const categories = [];

  for (const category of unsdgCategories) {
    const now = toUTC(new Date());
    const _category = new UnsdgCategoryModel({
      ...category,
      createdAt: now,
      lastModified: now,
    });
    await _category.save();
    categories.push(_category);
  }

  console.log(`[+] ${categories.length} unsdg_categories created`);

  return categories;
};

const createSubCategories = async (categories: IUnsdgCategoryDocument[]) => {
  console.log('creating unsdg_subcategories...');
  const subCategories = [];

  for (const subCategory of unsdgSubcategories) {
    const category = subCategory.category === 0
      ? categories.find(c => c.name === 'Planet')
      : categories.find(c => c.name === 'People');
    const now = toUTC(new Date());
    const _subCategory = new UnsdgSubcategoryModel({
      ...subCategory,
      category,
      createdAt: now,
      lastModified: now,
    });

    await _subCategory.save();
    subCategories.push(_subCategory);
  }

  console.log(`[+] ${subCategories.length} unsdg_subcategories created`);
  return subCategories;
};

const createUNSDGs = async (subCategories: IUnsdgSubcategoryDocument[]) => {
  console.log('creating unsdgs...');
  const unsdgs = [];

  for (const unsdg of rawUnsdgs) {
    let subCategory;
    if (unsdg.subCategory === 0) {
      subCategory = subCategories.find(s => s.name === 'Sustainability');
    } else if (unsdg.subCategory === 1) {
      subCategory = subCategories.find(s => s.name === 'Climate Action');
    } else if (unsdg.subCategory === 2) {
      subCategory = subCategories.find(s => s.name === 'Community Welfare');
    } else if (unsdg.subCategory === 3) {
      subCategory = subCategories.find(s => s.name === 'Diversity & Inclusion');
    }
    const now = toUTC(new Date());
    const _unsdg = new UnsdgModel({
      ...unsdg,
      subCategory,
      createdAt: now,
      lastModified: now,
    });

    await _unsdg.save();
    unsdgs.push(_unsdg);
  }

  console.log(`[+] ${unsdgs.length} unsdgs created`);
  return unsdgs;
};

const createCompanyUNSDGs = async (unsdgs: IUnsdgDocument[], includeHidden = false) => {
  console.log('creating companyUnsdgs...');
  let count = 0;
  const query: FilterQuery<ICompany> = { 'creation.status': { $ne: CompanyCreationStatus.InProgress } };
  if (!includeHidden) query['hidden.status'] = false;
  const companies = await CompanyModel.find(query).lean();

  for (const company of companies) {
    for (let i = 0; i < 17; i++) {
      const now = toUTC(new Date());
      const _unsdg = new CompanyUnsdgModel({
        company: company._id,
        unsdg: unsdgs[i],
        value: (company as any)[`unSdg${i + 1}`],
        year: 2021,
        createdAt: now,
        lastModified: now,
      });

      try {
        await _unsdg.save();
        count += 1;
      } catch (err: any) {
        console.log(err.message);
        // swallowing error...
      }
    }
  }

  console.log(`[+] ${count} out of ${companies.length * 17} companyUnsdgs created`);
};

export const mapUNSDGs = async () => {
  console.log('\n\nnew unsdg mapper starting...');
  const [categories, subcategories, unsdgs] = await prepare();
  const _categories: IUnsdgCategoryDocument[] = categories.length ? categories : await createCategories();
  const _subcategories: IUnsdgSubcategoryDocument[] = subcategories.length ? subcategories : await createSubCategories(_categories);
  const _unsdgs = unsdgs.length ? unsdgs : await createUNSDGs(_subcategories);
  await createCompanyUNSDGs(_unsdgs);

  // TODO: create new endpoint to get a company's unsdgs

  console.log('[+] new unsdg mappings created\n\n');
};
