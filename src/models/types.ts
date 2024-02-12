import { ComplyAdvantageMatchStatus, HitDocMatchTypeEnum, MatchTypesDetailsMatchTypeEnum, SecondaryMatchTypeEnum } from '../integrations/complyAdvantage/types';

export const ComplyAdvantageIntegrationSchema = {
  type: {
    client_ref: String,
    id: Number,
    ref: String,
    searcher_id: Number,
    assignee_id: Number,
    filters: {
      types: { type: [String] },
      birth_year: { type: Number },
      remove_deceased: { type: String },
      entity_type: { type: String },
      exact_match: { type: Boolean },
      fuzziness: { type: Number },
    },
    match_status: { type: String, enum: Object.values(ComplyAdvantageMatchStatus) },
    risk_level: String,
    search_term: String,
    submitted_term: String,
    total_hits: Number,
    total_matches: Number,
    total_blacklist_hits: Number,
    created_at: String,
    updated_at: String,
    tags: [String],
    labels: [String],
    hits: {
      type: [
        {
          doc: {
            type: {
              aka: {
                type: [
                  {
                    name: { type: String },
                  },
                ],
              },
              associates: {
                type: [
                  {
                    name: { type: String },
                    association: { type: String },
                  },
                ],
              },
              entity_type: { type: String },
              fields: {
                type: [
                  {
                    locale: { type: String },
                    name: { type: String },
                    source: { type: String },
                    tag: { type: String },
                    value: { type: String },
                  },
                ],
              },
              first_name: { type: String },
              id: { type: String },
              last_name: { type: String },
              last_updated_utc: { type: String },
              middle_names: { type: String },
              media: {
                type: [
                  {
                    date: { type: String },
                    snippet: { type: String },
                    title: { type: String },
                    url: { type: String },
                  },
                ],
              },
              name: { type: String },
              sources: { type: [String] },
              types: { type: [String] },
            },
          },
          is_whitelisted: { type: Boolean },
          match_types: { type: [{ type: String, enum: Object.values(HitDocMatchTypeEnum) }] },
          match_type_details: [
            {
              matching_name: { Type: String },
              sources: { type: [String] },
              aml_types: { type: [String] },
              name_matches: [
                {
                  query_term: { type: String },
                  match_types: { type: [{ type: String, enum: Object.values(MatchTypesDetailsMatchTypeEnum) }] },
                },
              ],
              secondary_matches: [
                {
                  query_term: { type: String },
                  match_types: { type: [{ type: String, enum: Object.values(SecondaryMatchTypeEnum) }] },
                },
              ],
            },
          ],
          score: Number,
        },
      ],
    },
    blacklist_hits: Array,
  },
};
