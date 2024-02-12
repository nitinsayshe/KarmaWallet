import { ComplyAdvantage } from '../../clients/complyAdvantage';
import {
  ComplyAdvantageEntityType,
  ComplyAdvantageMatchStatus,
  IComplyAdvantageIntegration,
  IComplyAdvantageSearchResponseContent,
} from './types';

export interface ICreateSearchForUserData {
  refId?: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  isUser?: boolean;
  isVisitor?: boolean;
}

export const monitorComplyAdvantageSearch = async (searchId: number) => {
  try {
    const complyAdvantage = new ComplyAdvantage();
    const monitorActivationRes = await complyAdvantage.toggleMonitorSearch(searchId, true);
    return monitorActivationRes;
  } catch (err) {
    console.error('Error activating monitor', err);
  }
};

export const createComplyAdvantageSearch = async (data: ICreateSearchForUserData): Promise<IComplyAdvantageSearchResponseContent> => {
  try {
    const complyAdvantage = new ComplyAdvantage();
    const { refId, firstName, lastName, birthYear } = data;
    if (!firstName || !lastName || !birthYear || !refId) throw new Error('No user or visitor provided');
    const params = {
      search_term: `${firstName} ${lastName}`,
      client_ref: refId,
      filters: {
        types: ['sanction', 'warning', 'fitness-probity'],
        birth_year: birthYear,
        remove_deceased: '1',
        entity_type: ComplyAdvantageEntityType.person,
      },
    };
    const searchRes = await complyAdvantage.createNewSearch(params);
    if (!searchRes) throw new Error('Error creating search');

    return searchRes;
  } catch (err) {
    throw new Error('Error creating search');
  }
};

/// TO DO: Update to reflect whatever we determine should result in a decline state
export const userPassesComplyAdvantage = async (searchResponse: IComplyAdvantageIntegration) => {
  if (
    searchResponse.match_status === ComplyAdvantageMatchStatus.noMatch
    && searchResponse.total_matches === 0 // total_matches includes total_hits and total_blacklist_hits
  ) { return true; }
  return false;
};

export const deleteComplyAdvantageSearch = async (searchId: string) => {
  try {
    const complyAdvantage = new ComplyAdvantage();
    const search = await complyAdvantage.deleteSearch(searchId);
    return search;
  } catch (err) {
    console.log('////// Error deleting search', err);
  }
};
