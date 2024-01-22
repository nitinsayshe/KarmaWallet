import { GroupModel } from '../../models/group';
import { UserModel } from '../../models/user';
import { joinGroup } from '../groups';
import { updateNewUserSubscriptions } from '../subscription';

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
        } as any);

        await joinGroup(mockRequest);
        const subscribeData: any = { debitCardholder: true };
        // console.log('////// this is the response of joining the user', !!userGroup);
        subscribeData.groupName = group.name;
        subscribeData.tags = [group.name];
        subscribeData.employerBeta = true;
        console.log('////// this is the subscribe data', subscribeData);
        await updateNewUserSubscriptions(user, subscribeData);
      }
      console.log('///// success fully updated for', item.email);
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
      console.log('/////// success fully updated for', item.name);
    }
  } catch (err) {
    console.log('////// error', err);
  }
};
