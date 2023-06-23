interface Identification {
  type: string;
  value: string;
}

interface Metadata {
  notification_email: string;
  notification_language: string;
  authentication_question1: string;
  authentication_question2: string;
  authentication_question3: string;
  authentication_answer1: string;
  authentication_answer2: string;
  authentication_answer3: string;
}

export interface IMarqetaCreateUser {
  first_name: string;
  last_name: string;
  token?: string;
  email: string;
  password: string;
  identifications: Identification[];
  birth_date: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  gender: string;
  uses_parent_account: boolean;
  metadata: Metadata;
}

export interface IMarqetaCreateCard {
  user_token: string;
  card_product_token: string;
}

export interface IMarqetaCreateGPAorder{
  user_token:string;
  amount: number;
  currency_code:string;
  funding_source_token:string;
}

export interface IMarqetaProcessKyc{
  user_token:string;
}

export interface IMarqetaCardTransition{
  user_token:string;
  channel:string;
  state:string;
}
