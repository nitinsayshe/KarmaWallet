import axios, { AxiosInstance } from 'axios';
import { SdkClient } from './sdkClient';
import { asCustomError } from '../lib/customError';

const GOOGLE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
const { GOOGLE_MAPS_API_KEY } = process.env;

export class GoogleMapsClient extends SdkClient {
  private _client: AxiosInstance;

  constructor() {
    super('GoogleMapsClient');
  }

  protected _init() {
    if (!GOOGLE_BASE_URL || !GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps credentials not found');
    }

    this._client = axios.create({
      baseURL: GOOGLE_BASE_URL,
    });
  }

  public async getCoordinates(zipCode: string) {
    try {
      const { data } = await this._client.get(`${zipCode}&key=${GOOGLE_MAPS_API_KEY}`);
      if (data.status !== 'OK') throw new Error('Failed to get coordinates');
      return {
        latitude: data.results[0].geometry.location.lat,
        longitude: data.results[0].geometry.location.lng,
      };
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
