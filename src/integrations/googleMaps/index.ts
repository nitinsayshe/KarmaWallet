import { GoogleMapsClient } from '../../clients/googleMaps';

export const getCoordinates = async (zipCode: string) => {
  const googleMapsClient = new GoogleMapsClient();
  return googleMapsClient.getCoordinates(zipCode);
};
