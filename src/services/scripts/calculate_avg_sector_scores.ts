import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';

interface IAvgScores {
  sectorId: string;
  sectorName: string;
  numCompanies: number;
  avgScore: number;
  avgPlanetScore: number;
  avgPeopleScore: number;
  avgSustainabilityScore: number;
  avgClimateActionScore: number;
  avgCommunityWelfareScore: number;
  avgDiversityInclusionScore: number;
}

interface IAvgCategoryScores {
  categoryId: string;
  categoryName: string;
  avgScore: number;
}

interface IAvgSubcategoryScores {
  subcategoryId: string;
  subcategoryName: string;
  avgScore: number;
}

export const calculateAvgSectorScores = async () => {
  console.log('\ncalculating average scores for all sectors...');
  let sectors: ISectorDocument[];

  try {
    sectors = await SectorModel.find({});
  } catch (err) {
    console.log('[-] Error retrieving sectors: ', err);
  }

  if (!sectors) return;

  const avgScores: IAvgScores[] = [];

  for (const sector of sectors) {
    const companies = await CompanyModel
      .find({ 'sectors.sector': sector })
      .populate([
        {
          path: 'categoryScores.category',
          model: UnsdgCategoryModel,
        },
        {
          path: 'subcategoryScores.subcategory',
          model: UnsdgSubcategoryModel,
        },
      ]);

    if (!companies?.length) {
      avgScores.push({
        sectorId: sector._id.toString(),
        sectorName: sector.name,
        numCompanies: 0,
        avgScore: 0,
        avgPlanetScore: 0,
        avgPeopleScore: 0,
        avgSustainabilityScore: 0,
        avgClimateActionScore: 0,
        avgCommunityWelfareScore: 0,
        avgDiversityInclusionScore: 0,
      });

      continue;
    }

    let scoreSum = 0;
    let planetSum = 0;
    let peopleSum = 0;
    let sustainabilitySum = 0;
    let climateActionSum = 0;
    let communityWelfareSum = 0;
    let diversityInclusionSum = 0;

    for (const company of companies) {
      scoreSum += company.combinedScore;

      for (const category of company.categoryScores) {
        if ((category.category as IUnsdgCategoryDocument).name === 'Planet') {
          planetSum += category.score;
        }

        if ((category.category as IUnsdgCategoryDocument).name === 'People') {
          peopleSum += category.score;
        }
      }

      for (const subcategory of company.subcategoryScores) {
        if ((subcategory.subcategory as IUnsdgSubcategoryDocument).name === 'Sustainability') {
          sustainabilitySum += subcategory.score;
        }

        if ((subcategory.subcategory as IUnsdgSubcategoryDocument).name === 'Climate Action') {
          climateActionSum += subcategory.score;
        }

        if ((subcategory.subcategory as IUnsdgSubcategoryDocument).name === 'Community Welfare') {
          communityWelfareSum += subcategory.score;
        }

        if ((subcategory.subcategory as IUnsdgSubcategoryDocument).name === 'Diversity & Inclusion') {
          diversityInclusionSum += subcategory.score;
        }
      }
    }

    const avgScore = scoreSum / companies.length;
    const avgPlanetScore = planetSum / companies.length;
    const avgPeopleScore = peopleSum / companies.length;
    const avgSustainabilityScore = sustainabilitySum / companies.length;
    const avgClimateActionScore = climateActionSum / companies.length;
    const avgCommunityWelfareScore = communityWelfareSum / companies.length;
    const avgDiversityInclusionScore = diversityInclusionSum / companies.length;

    avgScores.push({
      sectorId: sector._id.toString(),
      sectorName: sector.name,
      numCompanies: companies.length,
      avgScore,
      avgPlanetScore,
      avgPeopleScore,
      avgSustainabilityScore,
      avgClimateActionScore,
      avgCommunityWelfareScore,
      avgDiversityInclusionScore,
    });
  }

  const _csv = parse(avgScores);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'avg_company_scores_by_sector.csv'), _csv);

  console.log('[+] avg sector scores calculated\n');
};

export const calculateAvgCategoryScores = async () => {
  console.log('\ncalculating avg category and subcategory scores...');

  let categories: IUnsdgCategoryDocument[];
  let subcategories: IUnsdgSubcategoryDocument[];
  let unsdgs: IUnsdgDocument[];
  let companies: ICompanyDocument[];

  try {
    categories = await UnsdgCategoryModel.find({});
    subcategories = await UnsdgSubcategoryModel.find({});
    unsdgs = await UnsdgModel.find({});
    companies = await CompanyModel.find({});
  } catch (err) {
    console.log('\n[-] error getting categories, subcategories, unsdgs or companies: ', err);
  }

  if (!categories?.length || !subcategories?.length || !unsdgs?.length || !companies?.length) return;

  const allCategoryScores: { [key: string]: number[] } = {};
  const allSubcategoryScores: { [key: string]: number[] } = {};

  for (const company of companies) {
    for (const catScore of company.categoryScores) {
      if (!allCategoryScores[catScore.category.toString()]) allCategoryScores[catScore.category.toString()] = [];
      allCategoryScores[catScore.category.toString()].push(catScore.score);
    }

    for (const subcatScore of company.subcategoryScores) {
      if (!allSubcategoryScores[subcatScore.subcategory.toString()]) allSubcategoryScores[subcatScore.subcategory.toString()] = [];
      allSubcategoryScores[subcatScore.subcategory.toString()].push(subcatScore.score);
    }
  }

  const avgCategoryScores: IAvgCategoryScores[] = [];
  const avgSubcategoryScores: IAvgSubcategoryScores[] = [];

  for (const [categoryId, scores] of Object.entries(allCategoryScores)) {
    const category = categories.find((cat) => cat._id.toString() === categoryId);
    if (!category) {
      console.log('[-] category not found: ', categoryId);
      continue;
    }

    avgCategoryScores.push({
      categoryId,
      categoryName: category.name,
      avgScore: scores.reduce((acc, curr) => acc + curr, 0) / scores.length,
    });
  }

  for (const [subcategoryId, scores] of Object.entries(allSubcategoryScores)) {
    const subcategory = subcategories.find((subcat) => subcat._id.toString() === subcategoryId);
    if (!subcategory) {
      console.log('[-] subcategory not found: ', subcategoryId);
      continue;
    }

    avgSubcategoryScores.push({
      subcategoryId,
      subcategoryName: subcategory.name,
      avgScore: scores.reduce((acc, curr) => acc + curr, 0) / scores.length,
    });
  }

  const _avgCatScores = parse(avgCategoryScores);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'avg_category_scores.csv'), _avgCatScores);

  const _avgSubcatScores = parse(avgSubcategoryScores);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'avg_subcategory_scores.csv'), _avgSubcatScores);

  console.log('[+] avg category and subcategory scores calculated\n');
};

export const calculateAvgScores = async () => {
  await calculateAvgSectorScores();
  await calculateAvgCategoryScores();
};
