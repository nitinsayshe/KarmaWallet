import fs from 'fs';
import path from 'path';
import { GroupModel } from '../../models/group';
import { UserModel } from '../../models/user';
import { joinGroup } from '../groups/utils';
import { updateNewUserSubscriptions } from '../subscription';
import { CardModel } from '../../models/card';
import { UserGroupModel } from '../../models/userGroup';
import { TransactionCreditSubtypeEnum } from '../../lib/constants/transaction';
import { GPA } from '../../clients/marqeta/gpa';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';

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

export const checkForDuplicatesInArrays = (data: []) => {
  const unique = [...new Set(data)];
  if (unique.length !== data.length) {
    throw new Error('Duplicate found');
  }
};

export const checkProgramAccountBalanceHasEnough = async (amount: number) => {
  const amountNeeded = amount + 25000;
  const marqetaClient = new MarqetaClient();
  const gpa = new GPA(marqetaClient);
  // check program funding balance
  const programFundingResponse = await gpa.getProgramFundingBalance();
  if (programFundingResponse.available_balance < amountNeeded) {
    console.log('////// Program funding source balance is not enough to make GPA deposit.');
    return false;
  }

  return true;
};

export const confirmInGroup = async (userId: string, groupId: string) => {
  const userGroup = await UserGroupModel.findOne({
    user: userId,
    group: groupId,
  });

  if (!userGroup) {
    throw new Error(`[+] User ${userId} not in group`);
  }
};

export const buildEmployerDepositData = async (memo: string, groupId: string) => {
  const rawEmployees = fs.readFileSync(path.resolve(__dirname, './.tmp', 'employeesFormatted.json'), 'utf8');
  const employees = JSON.parse(rawEmployees);
  const gpaDepositArray = [];
  const total = employees.reduce((acc: any, curr: any) => acc + curr.amount, 0);

  checkForDuplicatesInArrays(employees.map((employee: any) => employee.id));
  const hasEnough = await checkProgramAccountBalanceHasEnough(total);
  if (!!hasEnough) {
    console.log('////// Program funding source balance is enough to make a cashBack !');
    for (const employee of employees) {
      await confirmInGroup(employee.id, groupId);
      gpaDepositArray.push({
        userId: employee.id,
        amount: 200,
      });
    }
  }
  if (!hasEnough) throw new Error('Program funding source balance is not enough to make a cashBack !');

  console.log(`Added ${gpaDepositArray.length} employees to this gpaDepositArray`);

  return {
    type: TransactionCreditSubtypeEnum.Employer,
    gpaDeposits: gpaDepositArray,
    groupId,
    memo,
  };
};
