import { Types } from 'mongoose';

export const sectorsToExcludeFromTransactions = [
  // production
  new Types.ObjectId('621b9adb5f87e75f536670b4'), // payment services
  new Types.ObjectId('621b9ada5f87e75f53666f9a'), // commercial banking
  // staging
  new Types.ObjectId('62192ef3f022c9e3fbff0c28'), // payment services
  new Types.ObjectId('62192ef2f022c9e3fbff0b0e'), // commercial banking
];
