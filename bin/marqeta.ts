import 'dotenv/config';
import { MongoClient } from '../src/clients/mongo';
import { createDepositAccount, getDepositAccount } from '../src/integrations/marqeta/depositAccount';
import { UserModel } from '../src/models/user';
import { IMarqetaUserStatus } from '../src/integrations/marqeta/types';

// Function to assign deposit account numbers to all existing users in the database
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
  } catch (error) {
    console.error('Error assigning deposit account numbers to users:', error);
  }
})();
