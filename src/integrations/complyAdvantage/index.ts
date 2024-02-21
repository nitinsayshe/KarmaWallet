import { PaginateResult } from 'mongoose';
import { ComplyAdvantage } from '../../clients/complyAdvantage';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { sleep } from '../../lib/misc';
import { ServerModel, ServerTypesEnum, ServerSourcesEnum } from '../../models/server';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import {
  iterateOverUsersAndExecWithDelay,
  UserIterationRequest,
  UserIterationResponse,
} from '../../services/user/utils';
import { iterateOverVisitorsAndExecWithDelay, VisitorIterationRequest, VisitorIterationResponse } from '../../services/visitor/utils';
import { IRequest } from '../../types/request';
import {
  ComplyAdvantageEntityType,
  ComplyAdvantageGetSearchResponseContent,
  ComplyAdvantageMatchStatus,
  IComplyAdvantageIntegration,
  IComplyAdvantageSearchResponseContent,
  IComplyAdvantageWebhookBody,
} from './types';

const backoffMs = 500;

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

export const getComplyAdvantageSearch = async (
  user: IUserDocument | IVisitorDocument,
): Promise<ComplyAdvantageGetSearchResponseContent> => {
  try {
    if (!user?.integrations?.complyAdvantage?.id) throw new Error('No complyAdvantage integration');

    const complyAdvantage = new ComplyAdvantage();
    const searchRes = await complyAdvantage.getSearch(user.integrations.complyAdvantage.id);
    return searchRes;
  } catch (err) {
    console.error('Error getting search', err);
  }
};

export const createComplyAdvantageSearch = async (data: ICreateSearchForUserData): Promise<IComplyAdvantageSearchResponseContent> => {
  try {
    const complyAdvantage = new ComplyAdvantage();
    const { refId, firstName, lastName, birthYear } = data;
    if (!firstName || !lastName || !birthYear || !refId) throw new Error('No user or visitor provided');
    const params = {
      search_term: {
        first_name: firstName,
        last_name: lastName,
      },
      client_ref: refId,
      fuzziness: 0.1,
      filters: {
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

export const userPassesComplyAdvantage = async (searchResponse: IComplyAdvantageIntegration) => {
  console.log('///// search response', searchResponse);
  if (
    searchResponse.match_status === ComplyAdvantageMatchStatus.noMatch
    && searchResponse.total_matches === 0 // total_matches includes total_hits and total_blacklist_hits
  ) {
    console.log('User passes comply advantage');
    return true;
  }
  return false;
};

export const deleteComplyAdvantageSearch = async (searchId: number) => {
  try {
    const complyAdvantage = new ComplyAdvantage();
    const search = await complyAdvantage.deleteSearch(searchId);
    return search;
  } catch (err) {
    console.log('////// Error deleting search', err);
  }
};

export const getExistingUserOrVisitorFromSearchId = async (searchId: number): Promise<IUserDocument | IVisitorDocument> => {
  let existingUser: IUserDocument | IVisitorDocument;
  try {
    existingUser = await UserModel.findOne({ 'integrations.complyAdvantage.id': searchId });
  } catch (e) {
    console.log(`Error looking up existing user with search_id: ${searchId}`, e);
  }
  if (!existingUser) {
    try {
      existingUser = await VisitorModel.findOne({ 'integrations.complyAdvantage.id': searchId });
    } catch (e) {
      console.log(`Error looking up existing visitor with search_id: ${searchId}`, e);
    }
  }
  return existingUser;
};

export const getExistingUserOrVisitorFromClientRef = async (clientRef: string): Promise<IUserDocument | IVisitorDocument> => {
  let existingUser: IUserDocument | IVisitorDocument;
  try {
    existingUser = await UserModel.findOne({ 'integrations.complyAdvantage.client_ref': clientRef });
  } catch (e) {
    console.log(`Error looking up existing user with client_ref: ${clientRef}`, e);
  }
  if (!existingUser) {
    try {
      existingUser = await VisitorModel.findOne({ 'integrations.complyAdvantage.client_ref': clientRef });
    } catch (e) {
      console.log(`Error looking up existing visitor with client_ref: ${clientRef}`, e);
    }
  }
  return existingUser;
};

export const updateSearchForUser = async (user: IUserDocument | IVisitorDocument): Promise<IUserDocument | IVisitorDocument> => {
  // fetch this search from comply advantage
  const updatedSearch = await getComplyAdvantageSearch(user);
  if (!updatedSearch) {
    throw new CustomError(
      `Error fetching updated search for user with search id: ${user.integrations.complyAdvantage.id}`,
      ErrorTypes.NOT_FOUND,
    );
  }

  try {
    // update the user with the new search results
    user.integrations.complyAdvantage = updatedSearch;
    return user.save();
  } catch (e) {
    throw new CustomError(`Error updating user with id: ${user._id}`, ErrorTypes.SERVER);
  }
};

export const verifyComplyAdvantageWebhookSource = async (req: IRequest<{}, {}, IComplyAdvantageWebhookBody>) => {
  // get the ip this request was sent from in the request
  let requesterIp: string = req.headers['x-forwarded-for'] || req.ip;
  requesterIp = requesterIp?.trim();

  // pull whitelisted Comply Advantage IPs from the database
  let whitelistedServers;
  try {
    whitelistedServers = await ServerModel.find({ type: ServerTypesEnum.Whitelist, source: ServerSourcesEnum.ComplyAdvantage });
  } catch (e) {
    throw new CustomError('Error fetching whitelisted servers', ErrorTypes.SERVER);
  }

  // check if the request was sent from a whitelisted IP
  if (!whitelistedServers.find((server) => server.ip === requesterIp)) {
    throw new CustomError('Access Denied', ErrorTypes.NOT_ALLOWED);
  }
};

// Doesn't update internal objects. Just pulls all searches and deletes them.
export const deleteAllSearchesFromComplyAdvantage = async () => {
  try {
    const complyAdvantage = new ComplyAdvantage();
    const searches = await complyAdvantage.getSearches();
    let err = false;
    while (searches.length > 0 && !err) {
      try {
        const nextSearches = await complyAdvantage.getSearches();
        console.log('fetched searches: ', nextSearches.length);
        // delete these searches
        for (const search of searches) {
          console.log(`deleting search with id: ${search.id}`);
          try {
            await complyAdvantage.deleteSearch(search.id);
          } catch (error) {
            console.error(`Error deleting search: ${error}`);
          }
          await sleep(backoffMs);
        }
      } catch (error) {
        console.error(`Error getting all searches: ${error}`);
        err = true;
      }
    }
    return searches;
  } catch (err) {
    console.error('Error getting all searches');
  }
};

export const deleteSearchForUser = async (user: IUserDocument | IVisitorDocument) => {
  if (!user?.integrations?.complyAdvantage?.id) { throw new CustomError(`No complyAdvantage integration for user with id: ${user._id}`, ErrorTypes.SERVER); }
  try {
    const complyAdvantage = new ComplyAdvantage();
    const search = await complyAdvantage.deleteSearch(user.integrations.complyAdvantage.id);
    return search;
  } catch (err) {
    console.error(`Error deleting search for user with id: ${user._id}`);
    console.error(err);
  }
};

export const deleteSearchAndUpdateUser = async (user: IUserDocument | IVisitorDocument): Promise<IUserDocument | IVisitorDocument> => {
  try {
    await deleteSearchForUser(user);
    user.integrations.complyAdvantage = undefined;
    return user.save();
  } catch (err) {
    throw new CustomError(`Error deleting search and updating user with id: ${user._id}`, ErrorTypes.SERVER);
  }
};

export const deleteAllUserSearches = async () => {
  console.log('updating users with account status === closed');
  try {
    const msDelayBetweenBatches = 1000;
    const req = {
      batchQuery: { 'integrations.complyAdvantage.client_ref': { $exists: true } },
      batchLimit: 100,
    };
    await iterateOverUsersAndExecWithDelay(
      req,
      async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
        for (const user of userBatch.docs) {
          try {
            console.log(
              `deleting search with id: ${user?.integrations?.complyAdvantage?.id} from user: ${user.emails.find((email) => !!email.primary).email}`,
            );
            await deleteSearchAndUpdateUser(user);
          } catch (err) {
            console.error(err);
          }
          await sleep(backoffMs);
        }

        return userBatch.docs.map((user: IUserDocument) => ({
          userId: user._id,
        }));
      },
      msDelayBetweenBatches,
    );

    console.log('updating visitors with account status === closed');
    await iterateOverVisitorsAndExecWithDelay(
      req,
      async (_: VisitorIterationRequest<{}>, visitorBatch: PaginateResult<IVisitorDocument>): Promise<VisitorIterationResponse<{}>[]> => {
        for (const visitor of visitorBatch.docs) {
          try {
            console.log(`deleting search with id: ${visitor?.integrations?.complyAdvantage?.id} from visitor with email: ${visitor.email}`);
            await deleteSearchAndUpdateUser(visitor);
          } catch (err) {
            console.error(err);
          }
          await sleep(backoffMs);
        }

        return visitorBatch.docs.map((visitor: IVisitorDocument) => ({
          visitorId: visitor._id,
        }));
      },
      msDelayBetweenBatches,
    );
  } catch (err) {
    console.error(err);
  }
};
