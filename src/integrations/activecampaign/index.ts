import { Schema } from 'mongoose';
import { ActiveCampaignClient } from '../../clients/activeCampaign';
import { CardModel } from '../../models/card';
import { CompanyModel } from '../../models/company';
import { GroupModel, IGroup, IGroupDocument, IShareableGroup } from '../../models/group';
import { IUserDocument, UserModel } from '../../models/user';
import { UserGroupModel, IShareableUserGroup, IUserGroupDocument } from '../../models/userGroup';
import { UserGroupStatus } from '../../types/groups';
import { IRef } from '../../types/model';

export type FieldIds = Array<{ name: string; id: number }>
export type FieldValues = Array<{ id: number; value: string }>
// duplicated code to avoid circular dependency
const getShareableUserGroupFromUserGroupDocument = ({
  _id,
  group,
  email,
  role,
  status,
  joinedOn,
}: IUserGroupDocument): (IShareableUserGroup & { _id: string }) => {
  let _group: IRef<Schema.Types.ObjectId, IShareableGroup | IGroup> = group;
  if (!!(_group as IGroupDocument)?.name) {
    _group = {
      _id,
      name: (_group as IGroupDocument).name,
      code: (_group as IGroupDocument).code,
      domains: (_group as IGroupDocument).domains,
      logo: (_group as IGroupDocument).logo,
      settings: (_group as IGroupDocument).settings,
      status: (_group as IGroupDocument).status,
      owner: {
        _id: ((_group as IGroupDocument).owner as IUserDocument)._id,
        name: ((_group as IGroupDocument).owner as IUserDocument).name,
      },
      totalMembers: (_group as IGroupDocument).members?.length || null,
      lastModified: (_group as IGroupDocument).lastModified,
      createdOn: (_group as IGroupDocument).createdOn,
    } as (IShareableGroup & { _id: string });
  }

  return {
    _id,
    email,
    role,
    status,
    joinedOn,
    group: _group,
  };
};

export const updateMadeCashBackEligiblePurchaseStatus = async (user: Partial<IUserDocument>) => {
  try {
    const ac = new ActiveCampaignClient();
    const customFields = await ac.getCustomFieldIDs();

    const fields = [];
    const customField = customFields.find((field) => field.name === 'madeCashbackEligiblePurchase');
    if (customField) {
      fields.push({ id: customField.id, value: 'true' });
    }
    const contacts = [{
      email: user.emails.find(e => e.primary).email,
      fields,
    }];
    await ac.importContacts({ contacts });
  } catch (err) {
    console.log('error updating cashback eligible purchase status');
  }
};

export const setLinkedCardData = async (userId: string, customFields: FieldIds, fieldValues: FieldValues) => {
  if (!customFields) {
    console.log('No custom fields provided');
    return fieldValues;
  }
  if (!fieldValues) {
    fieldValues = [];
  }

  // get linked card data
  try {
    const cards = await CardModel.find({
      userId,
      status: 'linked',
    }).sort({ createdOn: 1 });

    let customField = customFields.find((field) => field.name === 'hasLinkedCard');
    if (customField) {
      if (cards.length > 0) {
        fieldValues.push({ id: customField.id, value: 'true' });

        customField = customFields.find((field) => field.name === 'lastLinkedCardDate');
        if (customField) {
          fieldValues.push({ id: customField.id, value: cards[cards.length - 1].createdOn.toISOString() });
        }

        customField = customFields.find((field) => field.name === 'firstLinkedCardDate');
        if (customField) {
          fieldValues.push({ id: customField.id, value: cards[0].createdOn.toISOString() });
        }
      } else {
        fieldValues.push({ id: customField.id, value: 'false' });
      }
    }

    customField = customFields.find((field) => field.name === 'numLinkedCards');
    if (customField) {
      fieldValues.push({ id: customField.id, value: cards.length.toString() });
    }
  } catch (err) {
    console.log('error getting linked card data');
  }
  return fieldValues;
};

export const getCustomFieldIDsAndUpdateLinkedCards = async (userId: string) => {
  try {
    const ac = new ActiveCampaignClient();
    const user = await UserModel.findById(userId);
    if (!user) {
      return;
    }
    const customFields = await ac.getCustomFieldIDs();
    const fields = await setLinkedCardData(userId, customFields, []);

    const contacts = [{
      email: user.emails.find(e => e.primary).email,
      fields,
    }];

    await ac.importContacts({ contacts });
  } catch (err) {
    console.log('error updating linked card data');
  }
};

export const updateActiveCampaignTags = async (user: Partial<IUserDocument>) => {
  try {
    const ac = new ActiveCampaignClient();
    // get all group names this user is a part of
    const userGroups = await UserGroupModel.find({
      user: user._id,
      status: { $nin: [UserGroupStatus.Removed, UserGroupStatus.Banned, UserGroupStatus.Left] },
    }).populate([
      {
        path: 'group',
        model: GroupModel,
        populate: [
          {
            path: 'company',
            model: CompanyModel,
          },
          {
            path: 'owner',
            model: UserModel,
          },
        ],
      },
    ]);

    let groupNames: string[];
    if (userGroups) {
      groupNames = userGroups
        .map(g => getShareableUserGroupFromUserGroupDocument(g))
        .map(g => (g.group as IGroupDocument)?.name);
    }

    // add group as a tag in active campaign
    const contacts = [{
      email: user.emails.find(e => e.primary).email,
      tags: groupNames,
    }];
    await ac.importContacts({ contacts });
  } catch (err) {
    console.log('error updating active campaign tags');
  }
};
