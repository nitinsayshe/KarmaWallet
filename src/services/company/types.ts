import { CompanyRating } from '../../lib/constants/company';
import { CashbackCompanyDisplayLocation } from '../../models/company';
import { IRequest } from '../../types/request';

export interface ICompanyRequestParams {
  companyId: string;
}

export interface ICompanyRequestQuery {
  includeHidden?: boolean;
  search?: string;
  rating?: string;
  evaluatedUnsdgs?: string;
  cashback?: string;
  isMobile?: string;
  'sectors.sector'?: string;
}

export interface ICompanySearchRequest extends IRequest {
  query: ICompanyRequestQuery;
}

export interface IUpdateCompanyRequestBody {
  companyName: string;
  url: string;
  logo: string;
}

export interface ICompanySampleRequest {
  count?: number;
  sectors?: string;
  excludedCompanyIds?: string;
  ratings?: string;
}

export interface IBatchedCompaniesRequestBody {
  fileUrl: string;
}

export interface IBatchedCompanyParentChildRelationshipsRequestBody extends IBatchedCompaniesRequestBody {
  jobReportId?: string;
}

export interface IGetCompanyDataParams {
  page: string;
  limit: string;
}

export interface IGetPartnerQuery {
  companyId: string;
}

export enum FeaturedCashbackSortOptions {
  HighestCashback = 'highestCashback',
  Alphabetical = 'alphabetical',
}

export interface IGetFeaturedCashbackCompaniesQuery {
  location?: CashbackCompanyDisplayLocation;
  'sectors.sector'?: string;
  sort?: FeaturedCashbackSortOptions;
  number?: string;
}

export interface IGetFeaturedCashbackCompaniesRequest {
  query: IGetFeaturedCashbackCompaniesQuery;
}

interface ISubcategoryScore {
  subcategory: string;
  score: number;
}

interface ICategoryScore {
  category: string;
  score: number;
}

export interface ISectorScores {
  avgScore: number;
  avgPlanetScore: number;
  avgPeopleScore: number;
  avgSustainabilityScore: number;
  avgClimateActionScore: number;
  avgCommunityWelfareScore: number;
  avgDiversityInclusionScore: number;
}

export interface ISector {
  name: string;
  scores: ISectorScores;
}

export interface ICompanyProtocol {
  companyName: string;
  values: string[];
  rating: CompanyRating;
  score: number;
  karmaWalletUrl: string;
  companyUrl: string;
  subcategoryScores: ISubcategoryScore[];
  categoryScores: ICategoryScore[];
  wildfireId?: number;
  sector: ISector;
}

interface IPagination {
  page: number;
  totalPages: number;
  limit: number;
  totalCompanies: number;
}

export interface IGetCompaniesResponse {
  companies: ICompanyProtocol[];
  pagination: IPagination;
}

export interface ISearchCompaniesQuery {
  search: string;
}

export interface IFeaturedCashbackUpdatesParams {
  companyId: string;
  status: boolean;
  location: CashbackCompanyDisplayLocation[];
}
