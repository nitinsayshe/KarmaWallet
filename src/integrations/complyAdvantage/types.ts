export enum ComplyAdvantageEntityType {
  person = 'person',
  company = 'company',
  organisation = 'organisation',
  vessel = 'vessel',
  aircraft = 'aircraft',
}

export enum ComplyAdvantageFilterTypes {
  sanction = 'sanction',
  warning = 'warning',
  fitnessProbity = 'fitness-probity',
  pep = 'pep',
  pepClass1 = 'pep-class-1',
  pepClass2 = 'pep-class-2',
  pepClass3 = 'pep-class-3',
  pepClass4 = 'pep-class-4',
}

export enum ComplyAdvantageMatchStatus {
  noMatch = 'no_match',
  unknown = 'unknown',
  potentialMatch = 'potential_match',
  falsePositive = 'false_positive',
  truePositive = 'true_positive',
  truePositiveApprove = 'true_positive_approve',
  truePositiveReject = 'true_positive_reject',
}

export interface IComplyAdvantageFilters {
  types?: string[];
  birth_year?: number;
  // A flag which when set, removes deceased people from search results (1 or 0)
  remove_deceased?: string;
  country_codes?: string[];
  exact_match?: boolean;
  fuzziness?: number;
  entity_type?: ComplyAdvantageEntityType;
}

export interface IComplyAdvantageSearchParams {
  // max 255 characters, A string representing the name of the entity or an Object
  search_term?: string | {first_name: string; last_name: string; middle_names?: string};
  // Your reference for this person/entity for which you are searching. Used for tracking searches and auto-whitelisting recurring results
  client_ref?: string;
  // The Profile ID of a search profile that can be retrieved from the UI
  search_proifile?: string;
  // Determines how closely the returned results must match the supplied name Float(0.0 to 1.0). Overridden by exact_match
  fuzziness?: number;
  // Match results from the database, starting from the offset value (Integer(default 0))
  offset?: number;
  // Match results from the database, taking up to this many matches each search (Integer(default 100, Max 100))
  limit?: number;
  // Specify filters within the search to narrow down the results. These are specified below
  filters?: IComplyAdvantageFilters;
  // Object of name => value pairs (name must be string), must be existing tags
  tags?: object;
}

interface AkaName {
  name: string;
}

type Associate = {
  name: string;
  association: string;
};

type Field = {
  locale?: string;
  name: string;
  source: string;
  tag?: string;
  value: string;
};

type Media = {
  date: string;
  snippet: string;
  title: string;
  url: string;
};

interface HitDoc {
  aka?: AkaName[];
  associates?: Associate[];
  entity_type?: string;
  fields?: Field[];
  first_name?: string;
  id?: string;
  last_name?: string;
  last_updated_utc?: string;
  middle_names?: string;
  media?: Media[];
  name?: string;
  sources?: string[];
  types?: string[];
}

export const SecondaryMatchTypeEnum = {
  // The supplied birth_year matched exactly with one attached to the entity
  ExactBirthYearMatch: 'exact_birth_year_match',
  // The supplied birth_year fell within the allowed range of one attached to the entity
  FuzzyBirthYearMatch: 'fuzzy_birth_year_match',
};
export type SecondaryMatchTypeEnumValue = (typeof SecondaryMatchTypeEnum)[keyof typeof SecondaryMatchTypeEnum];

export const HitDocMatchTypeEnum = {
  // matched against the entity name exactly
  NameExact: 'name_exact',
  // The word was allowed to be missing from hit as part of name_variations behaviour
  NameVariationsRemoval: 'name_variations_removal',
  // matched against an entity AKA (also known as) entry exactly
  AkaExact: 'aka_exact',
  // matched closely to the name, but at least one word had an edit distance change
  NameFuzzy: 'name_fuzzy',
  // matched closely to an AKA name, but at least one word had an edit distance change
  AkaFuzzy: 'aka_fuzzy',
  // matched against the entity name phonetically
  PhoneticName: 'phonetic_name',
  // matched against an entity AKA phonetically
  PhoneticAka: 'phonetic_aka',
  // matched against the entity name with a synonym, e.g. "Robert Mugabe" => "Bob Mugabe"
  EquivalentName: 'equivalent_name',
  // matched against an entity AKA with a synonym, e.g. "Robert Mugabe" => "Bob Mugabe"
  EquivalentAka: 'equivalent_aka',
  // matched for a more complex reason, such as based on an acronym
  Unknown: 'unknown',
  // matched the birth year as given in filters, can be the exact year of +-1 year regarding the fuzziness and options
  YearOfBirth: 'year_of_birth',
  // a personal title, for example 'Mrs', was stripped from the search term
  RemovedPersonalTitle: 'removed_personal_title',
  // a personal suffix, for example 'PhD', was stripped from the search term
  RemovedPersonalSuffix: 'removed_personal_suffix',
  // an organisation prefix, for example 'JSC', was stripped from the search term
  RemovedOrganisationPrefix: 'removed_organisation_prefix',
  // an organisation suffix, for example 'Ltd', was stripped from the search term
  RemovedOrganisationSuffix: 'removed_organisation_suffix',
  // a clerical mark, for example 'DECEASED', was stripped from the search term
  RemovedClericalMark: 'removed_clerical_mark',
};
export type HitDocMatchTypeEnumValue = (typeof HitDocMatchTypeEnum)[keyof typeof HitDocMatchTypeEnum];

export const MatchTypesDetailsMatchTypeEnum = {
  // The word exactly matched a word in the matching_name
  ExactMatch: 'exact_match',
  // The word was a single insertion/deletion/replacement/transposition away from a word in the matching_name
  EditDistance: 'edit_distance',
  // Phonetic token(s) of word matched the phonetic token(s) of a word in the matching_name
  Phonetic: 'phonetic',
  // An equivalent name matched a word in the matching_name
  EquivalentName: 'equivalent_name',
  // The first letter of the word matched an initial in the matching_name
  WordToInitial: 'word_to_initial',
  // Initial matched the first letter of a word in the matching name
  InitialToWord: 'initial_to_word',
  // Concatenating this word with others in the search_term matched a word in the matching_name
  RemovedSpace: 'removed_space',
  // The digit representation of this number occurs in the matching name
  WordToDigit: 'word_to_digit',
  // The word representation of this number occurs in the matching name
  DigitToWord: 'digit_to_word',
  // The word was allowed to be missing from hit as part of name_variations behaviour
  NameVariationsRemoval: 'name_variations_removal',
  // The word was identified as a personal title and was stripped from the search term
  RemovedPersonalTitle: 'removed_personal_title',
  // The word was identified as a personal suffix and was stripped from the search term
  RemovedPersonalSuffix: 'removed_personal_suffix',
  // The word was identified as an organisation prefix and was stripped from the search term
  RemovedOrganisationPrefix: 'removed_organisation_prefix',
  // The word was identified as a organisation suffix and was stripped from the search term
  RemovedOrganisationSuffix: 'removed_organisation_suffix',
  // The word was identified as a clerical mark and was stripped from the search term
  RemovedClericalMark: 'removed_clerical_mark',
};
export type MatchTypesDetailsMatchTypeEnumValue = (typeof MatchTypesDetailsMatchTypeEnum)[keyof typeof MatchTypesDetailsMatchTypeEnum];

interface SecondaryMatch {
  query_term?: string;
  match_types?: SecondaryMatchTypeEnumValue[];
}

interface NameMatch {
  query_term?: string;
  match_types?: MatchTypesDetailsMatchTypeEnumValue[];
}

interface MatchTypeDetails {
  matching_name: string;
  sources: string[];
  aml_types: string[];
  name_matches: NameMatch[];
  secondary_matches: SecondaryMatch[];
}

interface Hit {
  doc?: HitDoc;
  is_whitelisted: boolean;
  match_types: HitDocMatchTypeEnumValue[];
  match_types_details?: MatchTypeDetails[];
  score: number;
}

export interface IComplyAdvantageIntegration {
  client_ref: string;
  id: number;
  assigned_to?: number;
  ref: string;
  searcher_id: number;
  assignee_id: number;
  filters: IComplyAdvantageFilters;
  match_status: ComplyAdvantageMatchStatus;
  risk_level: string;
  search_term: string;
  submitted_term: string;
  total_hits: number;
  total_matches: number;
  total_blacklist_hits?: number; // couldn't find this field in the docs;
  created_at: string;
  updated_at: string;
  tags: string[] | [];
  labels?: string[] | []; // couldn't find this field in the docs;
  blacklist_hits?: string[] | []; // couldn't find this field in the docs;
}

export interface IComplyAdvantageSearchResponseContent {
  data: {
    id: number;
    ref: string;
    searcher_id: number;
    assignee_id: number;
    filters: IComplyAdvantageFilters;
    match_status: ComplyAdvantageMatchStatus;
    risk_level: string;
    search_term: string;
    submitted_term: string;
    client_ref: string;
    total_hits: number;
    total_matches: number;
    updated_at: string;
    created_at: string;
    tags: string[];
    limit: number;
    offset: number;
    share_url: string;
    searcher: {
      id: number;
      email: string;
      name: string;
      phone: string;
      created_at: string;
    };
    assignee: {
      id: number;
      email: string;
      name: string;
      phone: string;
      created_at: string;
    };
    hits: Hit[];
  };
}

export type ComplyAdvantageGetSearchResponseContent = IComplyAdvantageSearchResponseContent['data'];

export interface IComplyAdvantageSearchResponse {
  code: number;
  status: string;
  content: IComplyAdvantageSearchResponseContent;
}

export interface ICompyAdvantageUpdateMonitoredSearchContent {
  search_id: number;
  ref: string;
  is_monitored: boolean;
  monitors: any[]; // what is the shape of these?
}

export interface IComplyAdvantageUpdateMonitoredSearchResponse {
  content: ICompyAdvantageUpdateMonitoredSearchContent;
  status: string; // expect 'success'
}

export const ComplyAdvantageWebhookEventEnum = {
  // fired whenever the match status of an entity or the is_whitelisted property of an entity is changed
  MatchStatusUpdated: 'match_status_updated',
  // fired whenever the status of a search is changed through case management functionality
  SearchStatusUpdated: 'search_status_updated',
  // fired when a monitored search has been detected as having updated search results available,
  // and/or the suspended state of the monitored search changes.
  MonitoredSearchUpdated: 'monitored_search_updated',
} as const;
export type ComplyAdvantageWebhookEventEnumValues = (typeof ComplyAdvantageWebhookEventEnum)[keyof typeof ComplyAdvantageWebhookEventEnum];

export type UpdateSearchData = {
  search_id: number;
}

export interface IMatchStatusUpdatedEventData {
  client_ref: string;
  search_id: number;
  entity_id: string;
  entity_match_status: ComplyAdvantageMatchStatus;
  is_whitelisted: boolean;
  tags: { [key: string]: string };
}

interface ISearchChanges {
  assigned_to?: number;
  risk_level?: string;
  match_status?: ComplyAdvantageMatchStatus;
}

export interface ISearchStatusUpdatedEventData {
  changes: {
    before?: ISearchChanges;
    after?: ISearchChanges;
  };
  ref: string; // search reference
  client_ref: string;
  search_id: number;
  terms: { name: string; hits: number }[];
  filters: IComplyAdvantageFilters;
}

export interface IMonitoredSearchUpdatedData {
  search_id: number;
  updated: string[];
  new: string[];
  removed: string[];
  is_suspended: boolean;
}

export type ComplyAdvantageWebhookDataTypes = IMatchStatusUpdatedEventData | ISearchStatusUpdatedEventData;
export interface IComplyAdvantageWebhookBody {
  event: ComplyAdvantageWebhookEventEnumValues;
  data: Array<ComplyAdvantageWebhookEventEnumValues>;
}
