import mongoose from 'mongoose';
import { Client } from './client';

const {
  DB_USER,
  DB_NAME,
  DB_PASS,
  DB_URL,
} = process.env;

class _MongoClient extends Client {
  constructor() {
    super('Mongo');
  }

  _connect = async () => {
    const mongoUri = DB_URL
      ? `mongodb://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_URL}:27017/${DB_NAME}?authSource=admin`
      : `mongodb://127.0.0.1:27017/${DB_NAME}`;

    mongoose.connection.on('error', (err) => {
      console.log(err);
    });

    mongoose.connection.on('connected', () => {
      console.log(`\nConnected successfully to${!!DB_URL ? '' : ' local'} MongoDB`);
    });

    await mongoose.connect(mongoUri);
  };
}

export const MongoClient = new _MongoClient();
