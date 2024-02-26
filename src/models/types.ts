import { ComplyAdvantageMatchStatus } from '../integrations/complyAdvantage/types';

export const ComplyAdvantageIntegrationSchema = {
  type: {
    client_ref: String,
    assigned_to: Number,
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
    blacklist_hits: Array,
  },
};
