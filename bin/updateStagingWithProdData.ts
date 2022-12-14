import util from 'util';

interface MongoConnectionParams {
  user: string;
  password: string;
  url: string;
  dbName: string;
  authsource?: string;
}

const exec = util.promisify(require('child_process').exec);

const getMongoConnectionString = ({
  user,
  password,
  url,
  dbName,
  authsource = 'admin',
}: MongoConnectionParams) => `mongodb://${user}:${encodeURIComponent(password)}@${url}/${dbName}?authSource=${authsource}`;

const getMongoExportCommand = ({
  mongoConnectionString,
  collection,
  dbName,
  path,
}) => `mongoexport --uri "${}" --collection ${collection} --jsonFormat canonical --out ${path}`;
