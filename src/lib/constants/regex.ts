export const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/gm;
export const ZIPCODE_REGEX = /^\d{5}(?:[-\s]\d{4})?$/;
export const URL_QUERY_PARAMS_REGEX = /^[a-zA-Z0-9_%.~+-]+$/;
export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/; // allows a-z, A-Z, 0-9, _ and -
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; // doesn't allow nil
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // allows YYYY-MM-DD format date
