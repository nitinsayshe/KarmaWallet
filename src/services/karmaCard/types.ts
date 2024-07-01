import { IUrlParam } from '../user/types';

export const { MARQETA_VIRTUAL_CARD_PRODUCT_TOKEN, MARQETA_PHYSICAL_CARD_PRODUCT_TOKEN } = process.env;

export interface IContinueKarmanCardApplicationRequestBody {
  email: string;
  personaInquiryId: string;
}

export interface IKarmaCardRequestBody {
  address1: string;
  address2?: string;
  birthDate: string;
  phone: string;
  city: string;
  email?: string;
  firstName: string;
  lastName: string;
  personaInquiryId: string;
  postalCode: string;
  ssn: string;
  state: string;
  urlParams?: IUrlParam[];
  sscid?: string;
  sscidCreatedOn?: string;
  xType?: string;
  productSubscriptionId?: string;
}

export interface IApplySuccessData {
  email: string;
  firstName: string;
  lastName: string;
  urlParams?: IUrlParam[];
  visitorId?: string;
  postalCode: string;
}

export interface INewLegalTextRequestBody {
  text: string;
  name: string;
}
export interface IUpdateLegalTextRequestParams {
  legalTextId: string;
}
