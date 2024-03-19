import { MongoClient } from '../clients/mongo';
import { createDepositAccount, getDepositAccount } from '../integrations/marqeta/depositAccount';
import { UserModel } from '../models/user';

// Function to assign deposit account numbers to all existing users in the database
(async () => {
  try {
    await MongoClient.init();
    // Fetch all existing users from the database
    const users = await UserModel.find({ 'integrations.marqeta.state': 'ACTIVE', 'emails.email': 'test-account-04@gmail.com' });

    // Iterate through each user and generate an deposit account number for them
    for (const user of users) {
      // get deposit account for user
      const depositAccount = await getDepositAccount(user._id);
      if (!depositAccount) {
        // Generate deposit account number & map into database
        const depoistNumber = await createDepositAccount(user);
        console.log(`Assigned deposit account number ${depoistNumber} to user ${user._id}`);
      }
      console.log(`this user ${user._id} already have deposit account number`);
    }
    console.log('deposit account numbers assigned to all users successfully.');
  } catch (error) {
    console.error('Error assigning deposit account numbers to users:', error);
  }
})();
