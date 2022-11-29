import { HubspotClient, ISubmitFormRequest } from '../../clients/hubspot';
import { HubspotFormId } from '../../types/subscription';

export enum InterestCategory {
  EmployerBenefit = 'employerBenefit',
  NonProfit = 'nonProfit',
  SocialMediaCommunity = 'socialMediaCommunity',
}

export interface InterestFormRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  organization?: string;
  interestCategory?: InterestCategory;
}

const interestFormRequestToSubmitFormRequest = (req: InterestFormRequest): ISubmitFormRequest => {
  const { firstName, lastName, email, organization, interestCategory } = req;
  const fields = [
    { name: 'firstname', value: firstName },
    { name: 'lastname', value: lastName },
    { name: 'email', value: email },
    { name: 'company', value: organization },
    { name: 'program_of_interest', value: interestCategory },
  ].filter(f => !!f.value);
  return {
    formId: HubspotFormId.groupsInterest,
    fields,
    context: {
      pageUri: process.env.FRONTEND_DOMAIN,
    },
  };
};

export const submitInterestForm = async (req: InterestFormRequest) => {
  const hs = new HubspotClient();
  const submitFormReq = interestFormRequestToSubmitFormRequest(req);
  return hs.submitForm(submitFormReq);
};
