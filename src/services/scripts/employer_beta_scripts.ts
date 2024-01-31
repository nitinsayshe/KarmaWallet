import fs from 'fs';
import path from 'path';
import { GroupModel } from '../../models/group';
import { UserModel } from '../../models/user';
import { joinGroup } from '../groups';
import { updateNewUserSubscriptions } from '../subscription';
import { CardModel } from '../../models/card';
import { UserGroupModel } from '../../models/userGroup';
import { TransactionCreditSubtypeEnum } from '../../lib/constants/transaction';

export interface IEmployerBetaUserInfo {
  code: string;
  email: string;
  userId: string;
  name: string;
}

// Add missed users to group and employerBeta
export const fixMissedAddToEmployerBetaAndGroup = async (data: IEmployerBetaUserInfo[]) => {
  try {
    for (const item of data) {
      const user = await UserModel.findOne({ _id: item.userId });
      const group = await GroupModel.findOne({ code: item.code });

      if (user && group) {
        const mockRequest = ({
          requestor: user,
          authKey: '',
          body: {
            code: item.code,
            email: user.emails.find((email) => !!email.primary).email,
            userId: user._id.toString(),
          },
          skipSubscribe: true,
        } as any);

        await joinGroup(mockRequest);
        const subscribeData: any = { debitCardholder: true };
        subscribeData.groupName = group.name;
        subscribeData.tags = [group.name];
        subscribeData.employerBeta = true;
        await updateNewUserSubscriptions(user, subscribeData);
      }
      console.log('///// successfully updated for', item.email);
    }
  } catch (error) {
    console.log('////// error', error);
  }
};

export interface IActiveCampaignUpdateData {
  id: string;
  name: string;
  groupName: string;
}

// Added to group but was not updated in Active Campaign
export const updateActiveCampaign = async (data: IActiveCampaignUpdateData[]) => {
  try {
    for (const item of data) {
      const user = await UserModel.findOne({ _id: item.id });
      if (!user) {
        console.log('////// user not found');
        continue;
      }
      const subscribeData: any = { debitCardholder: true };
      subscribeData.groupName = item.groupName;
      subscribeData.tags = [item.groupName];
      subscribeData.employerBeta = true;
      await updateNewUserSubscriptions(user, subscribeData);
      console.log('/////// successfully updated for', item.name);
    }
  } catch (err) {
    console.log('////// error', err);
  }
};

export const checkEmployeeListBeforeDeposit = async () => {
  // change with the list of employees you want to run checks on
  const rawEmployees = fs.readFileSync(path.resolve(__dirname, './.tmp', 'howden_tiger.json'), 'utf8');
  const employees = JSON.parse(rawEmployees);
  const errors = [];
  const employeeData = [];

  for (const employee of employees) {
    console.log('///// Checking Employee:', employee.email);
    const user = await UserModel.findOne({ 'emails.email': employee.email });

    if (!user) {
      console.log('///// No User found');
      errors.push({
        email: employee.email,
        error: 'No user found',
      });
      continue;
    } else {
      employeeData.push({
        userId: user._id,
        email: employee.email,
        amount: 200,
      });
    }

    const cards = await CardModel.find({
      'integrations.marqeta': { $ne: null },
      userId: user._id,
    });

    if (cards.length < 2) {
      console.log('////// User has fewer than two Marqeta Cards');
      errors.push({
        email: employee.email,
        error: `Has ${cards.length} cards only`,
      });
    }

    if (cards.length > 2) {
      console.log('////// User has more than two Marqeta Cards');
      errors.push({
        email: employee.email,
        error: `Has ${cards.length} cards`,
      });
    }

    const userGroups = await UserGroupModel.findOne({ user: user._id });
    if (!userGroups) {
      console.log('////// User is not in a group');
      errors.push({
        email: employee.email,
        error: 'Employee not in a group',
      });
    }

    if (!user.integrations.marqeta) {
      console.log('///// User does not have marqeta integration');
    }

    if (!!user && user?.integrations?.marqeta?.status !== 'ACTIVE') {
      console.log('///// User not in Active State');
      errors.push({
        email: employee.email,
        error: 'Employee not in active user state',
      });
    }
  }

  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'employeeErrors.json'), JSON.stringify(errors));
  fs.writeFileSync(path.resolve(__dirname, './.tmp', 'employeesFormatted.json'), JSON.stringify(employeeData));
};

export const buildEmployerDepositData = async (memo: string, groupId: string) => {
  const rawEmployees = fs.readFileSync(path.resolve(__dirname, './.tmp', 'employeesFormatted.json'), 'utf8');
  const employees = JSON.parse(rawEmployees);
  const gpaDepositArray = [];

  for (const employee of employees) {
    gpaDepositArray.push({
      userId: employee.userId,
      amount: 200,
    });
  }

  console.log(`Added ${gpaDepositArray.length} employees to this gpaDepositArray`);

  return {
    type: TransactionCreditSubtypeEnum.Employer,
    gpaDeposits: gpaDepositArray,
    groupId,
    memo,
  };
};
