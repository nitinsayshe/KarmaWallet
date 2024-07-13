import { IRequestHandler } from '../../../types/request';
import * as GoogleMapsService from '../../../integrations/googleMaps';
import { asCustomError } from '../../../lib/customError';
import * as output from '../../../services/output';
import { IGetCoordinatesParams } from '../../../integrations/googleMaps/types';

export const getCoordinates: IRequestHandler<IGetCoordinatesParams, {}, {}> = async (req, res) => {
  try {
    if (!req.params.zipCode) {
      throw new Error('Zip code is required');
    }
    const coordinates = await GoogleMapsService.getCoordinates(req.params.zipCode);
    output.api(req, res, coordinates);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
