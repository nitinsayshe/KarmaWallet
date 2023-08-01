import { CardNetwork } from '../../../lib/constants';

export const getNetworkFromBin = (bin: string): CardNetwork | null => {
  const binPrefix = bin.slice(0, 2);
  if (!binPrefix) {
    return null;
  }
  if (binPrefix === '34') {
    return CardNetwork.Amex;
  }
  if (binPrefix === '37') {
    return CardNetwork.Amex;
  }
  if (binPrefix[0] === '4') {
    return CardNetwork.Visa;
  }
  if (binPrefix[0] === '5') {
    return CardNetwork.Mastercard;
  }
  if (binPrefix[0] === '6') {
    return CardNetwork.Discover;
  }
  return null;
};
