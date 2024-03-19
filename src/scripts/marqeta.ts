import 'dotenv/config';
import { error } from 'console';
import { asCustomError } from '../lib/customError';
import { Logger } from '../services/logger';
import { createDepositAccount, getDepositAccount } from '../integrations/marqeta/depositAccount';
import { UserModel } from '../models/user';
import { IMarqetaUserStatus } from '../integrations/marqeta/types';
import { MongoClient } from '../clients/mongo';

// Function to assign deposit account numbers to all existing marqeta active users in the karma database
(async () => {
  try {
    await MongoClient.init();
    // Fetch all existing users from the database
    const users = await UserModel.find({ 'integrations.marqeta.status': IMarqetaUserStatus.ACTIVE });
    // Iterate through each user and generate an deposit account number for them
    for (const user of users) {
      // check for the user if he is already having any ACTIVE deposit acccount
      const depositAccount = await getDepositAccount(user._id);
      if (!depositAccount) {
        // Generate deposit account number & map into database
        const depoistNumber = await createDepositAccount(user);
        console.log(`Assigned deposit account number ${depoistNumber?.account_number} to user ${user._id}`);
      }
      console.log(`this user ${user._id} already have deposit account number`);
    }
    console.log('deposit account numbers assigned to all users successfully.');

    MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.error('Error assigning deposit account numbers to users:', error);
  } finally {
    MongoClient.disconnect();
  }
})();
