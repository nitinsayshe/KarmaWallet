import isemail from 'isemail';
import { IJoinGroupRequest, getGroupOffsetData } from '.';
import { updateActiveCampaignGroupListsAndTags } from '../../integrations/activecampaign';
import { UserRoles, ErrorTypes, UserGroupRole } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { GroupModel, GroupStatus } from '../../models/group';
import { IUserDocument, UserModel } from '../../models/user';
import { IUserGroupDocument, UserGroupModel } from '../../models/userGroup';
import { UserGroupStatus } from '../../types/groups';
import { IRequest } from '../../types/request';
import { getUserGroupSubscriptionsToUpdate, updateUserSubscriptions } from '../subscription';
import { getUser } from '../user/utils';
import { UserEmailStatus } from '../../models/user/types';

export const checkIfUserInGroup = async (userId: string, groupId: string) => {
  const userGroup = await UserGroupModel.findOne({ user: userId, group: groupId });
  return userGroup;
};

export const joinGroup = async (req: IRequest<{}, {}, IJoinGroupRequest>) => {
  const karmaAllowList = [UserRoles.Admin, UserRoles.SuperAdmin];

  try {
    const { code, email, userId, skipSubscribe } = req.body;

    if (!code) throw new CustomError('A group code is required.', ErrorTypes.INVALID_ARG);
    if (!userId) throw new CustomError('No user specified to join this group.', ErrorTypes.INVALID_ARG);

    const group = await GroupModel.findOne({ code });
    if (!group) throw new CustomError(`A group was not found with code: ${code}`, ErrorTypes.NOT_FOUND);
    if (group.status === GroupStatus.Locked) throw new CustomError('This group is not accepting new members.', ErrorTypes.NOT_ALLOWED);

    let user: IUserDocument;

    if (userId === req.requestor._id.toString()) {
      user = await getUser(req, { _id: userId });
    } else {
      // requestor must be a Karma member to add another user to a group
      if (!karmaAllowList.includes(req.requestor.role as UserRoles)) throw new CustomError('You are not authorized to add another user to a group.', ErrorTypes.UNAUTHORIZED);
      user = await getUser(req, { _id: userId });
    }

    if (!user) throw new CustomError('User not found.', ErrorTypes.NOT_FOUND);
    // confirm that user has not been banned from group
    const usersUserGroup: IUserGroupDocument = await UserGroupModel
      .findOne({ group: group._id.toString(), user: user._id.toString() })
      .populate([
        {
          path: 'group',
          ref: GroupModel,
        },
      ]);

    if (!!usersUserGroup) {
      if (usersUserGroup?.status === UserGroupStatus.Banned) {
        throw new CustomError('You are not authorized to join this group.', ErrorTypes.UNAUTHORIZED);
      }

      if (
        usersUserGroup?.status === UserGroupStatus.Unverified
        || usersUserGroup?.status === UserGroupStatus.Verified
        || usersUserGroup?.status === UserGroupStatus.Approved
      ) {
        return usersUserGroup;
      }
    }

    // TODO: status === Removed, check if needs approval to join again
    let validEmail: string;
    const hasDomainRestrictions = group.settings.allowDomainRestriction && group.domains.length > 0;
    if (hasDomainRestrictions) {
      if (!isemail.validate(email, { minDomainAtoms: 2 })) {
        throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
      }

      // ??? should we support falling back to existing user emails if the groupEmail does not
      // meet the groups requirements???
      // const validEmail = [groupEmail, user.email, ...(user.altEmails || [])].find(email => {
      const _validEmail = [email].find(e => !!group.domains.find(domain => e.split('@')[1] === domain));
      if (!_validEmail) throw new CustomError(`A valid email from ${group.domains.length > 1 ? 'one of ' : ''}the following domain${group.domains.length > 1 ? 's' : ''} is required to join this group: ${group.domains.join(', ')}`);
      validEmail = _validEmail;
    }

    const existingEmail = hasDomainRestrictions ? user?.emails?.find(e => e.email === validEmail) : user?.emails?.find(e => e.primary);
    // add groupEmail to user's list of emails
    // if doesnt already exist and
    // is not their primary email
    if (!existingEmail) {
      // check if any other user has email
      const usersWithEmail = await UserModel.find({ 'emails.email': validEmail });
      if (usersWithEmail?.length > 0) throw new CustomError('This email is already in use.', ErrorTypes.UNPROCESSABLE);
      user.emails.push({
        email: validEmail,
        status: UserEmailStatus.Unverified,
        primary: false,
      });
    }

    // send verification email if
    // group has domain restriction AND
    // email exists and is unverified or
    // doesnt already exist
    // if (hasDomainRestrictions && ((existingEmail?.status === UserEmailStatus.Unverified) || !existingEmail)) {
    //   const token = await TokenService.createToken({
    //     user, days: emailVerificationDays, type: TokenTypes.Email, resource: { email: validEmail },
    //   });
    //   await sendGroupVerificationEmail({
    //     name: user.name,
    //     token: token.value,
    //     groupName: group.name,
    //     recipientEmail: validEmail,
    //     user: user._id,
    //   });
    // }

    // if the email used already exists and has been verified
    // the role to Verified.
    let userUserGroupDocument: IUserGroupDocument = null;

    if (!!usersUserGroup) {
      usersUserGroup.email = validEmail;
      usersUserGroup.role = UserGroupRole.Member;
      usersUserGroup.status = UserGroupStatus.Verified;
      userUserGroupDocument = await usersUserGroup.save();
    } else {
      const userGroup = new UserGroupModel({
        user,
        group,
        email: validEmail,
        role: UserGroupRole.Member,
        status: UserGroupStatus.Verified,
      });

      userUserGroupDocument = await userGroup.save();
    }

    if (!skipSubscribe) {
      const userSubscriptions = await getUserGroupSubscriptionsToUpdate(userUserGroupDocument.user as Partial<IUserDocument>);
      await updateActiveCampaignGroupListsAndTags(userUserGroupDocument.user as IUserDocument, userSubscriptions);
      await updateUserSubscriptions(userSubscriptions.userId, userSubscriptions.subscribe, userSubscriptions.unsubscribe);
    }

    // busting cache for group dashboard
    const appUser = await getUser(req, { _id: process.env.APP_USER_ID });
    await getGroupOffsetData({ ...req, requestor: appUser, params: { groupId: group._id.toString() } }, true);

    return userUserGroupDocument;
  } catch (err) {
    throw asCustomError(err);
  }
};
