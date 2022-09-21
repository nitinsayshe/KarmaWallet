import * as GoogleApis from 'googleapis';
import { ErrorTypes } from '../lib/constants';
import CustomError, { asCustomError } from '../lib/customError';
import { ConnectionClient } from './connectionClient';

const { google } = GoogleApis;

// https://console.cloud.google.com/iam-admin/serviceaccounts/details/111363174032168559414/keys?project=gnoll-345218&supportedpurview=project

export interface ICreateDriveRequest {
  name: string;
  parents?: string[];
  teamDriveId?: string;
}

export interface ICreateFileRequest {
  fileName: string;
  parents: string[];
  teamDriveId: string;
  mimeType: string;
  body: string;
}

export interface IGoogleClient {
  auth: GoogleApis.Common.JWT;
  drive: GoogleApis.drive_v3.Drive;
}

// https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest#json-web-tokens
// https://console.cloud.google.com/iam-admin/serviceaccounts/details/111363174032168559414;edit=true/keys?project=gnoll-345218&supportedpurview=project
const {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_CLIENT_PRIVATE_KEY,
} = process.env;

export class _GoogleClient extends ConnectionClient {
  private _client: IGoogleClient;

  constructor() {
    super('Google');
  }

  _connect = async () => {
    try {
      // https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest#json-web-tokens
      const authClient = new google.auth.JWT({
        email: GOOGLE_CLIENT_EMAIL,
        key: GOOGLE_CLIENT_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth: authClient });

      this._client = {
        auth: authClient,
        drive,
      };
    } catch (err: any) {
      throw new CustomError(`Error in Google Client authentication (message: ${err?.message ? err.message : err})`, ErrorTypes.SERVICE);
    }
  };

  handleError = (err: any) => {
    throw asCustomError(err?.message ? err.message : err);
  };

  getAllDrives = async () => {
    try {
      const res = await this._client?.drive.drives.list({ pageSize: 100 });
      return res?.data.drives;
    } catch (err) {
      this.handleError(err);
    }
  };

  getAllFiles = async (driveId: string) => {
    try {
      const res = await this._client?.drive.files.list({
        driveId,
        corpora: 'drive',
        pageSize: 1000,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });
      return res?.data?.files;
    } catch (err) {
      this.handleError(err);
    }
  };

  createFile = async ({
    body,
    fileName,
    parents,
    teamDriveId,
    mimeType,
  }: ICreateFileRequest) => {
    try {
      const res = await this._client?.drive.files.create({
        supportsTeamDrives: true,
        supportsAllDrives: true,
        requestBody: {
          teamDriveId,
          name: fileName,
          mimeType,
          parents,
        },
        media: {
          mimeType,
          body,
        },
      });
      return res?.data;
    } catch (err) {
      this.handleError(err);
    }
  };

  // TODO: look into why this is not working for teamdrive
  // createDirectory = async ({
  //   parents,
  //   name,
  //   teamDriveId,
  // }: ICreateDriveRequest) => {
  //   try {
  //     const res = await this._client?.drive.files.create({
  //       supportsAllDrives: true,
  //       supportsTeamDrives: true,
  //       requestBody: {
  //         teamDriveId,
  //         name,
  //         mimeType: 'application/vnd.google-apps.folder',
  //         parents: parents?.length ? parents : [],
  //       },
  //     });
  //     return res?.data;
  //   } catch (err) {
  //     this.handleError(err);
  //   }
  // };
}

export const GoogleClient = new _GoogleClient();
