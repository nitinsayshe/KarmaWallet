import mongoose from 'mongoose';
import { Client } from './client';

const {
  DB_USER,
  DB_NAME,
  DB_PASS,
  DB_URL,
} = process.env;

export class _MongoClient extends Client {
  private _db: typeof mongoose = null;

  constructor() {
    super('Mongo');
  }

  _connect = async () => {
    const mongoUri = DB_URL
      ? `mongodb://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_URL}/${DB_NAME}?authSource=admin`
      : `mongodb://127.0.0.1:27017/${DB_NAME}`;

    mongoose.connection.on('error', (err) => {
      console.log(err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(`Disconnected from${!!DB_URL ? '' : ' local'} MongoDB`);
    });

    mongoose.connection.on('connected', () => {
      console.log(`\nConnected successfully to${!!DB_URL ? '' : ' local'} MongoDB`);
    });

    this._db = await mongoose.connect(mongoUri);
  };

  disconnect = () => {
    console.log('disconnecting from MongoDB...');
    this._db?.disconnect();
  };
}

export const MongoClient = new _MongoClient();
