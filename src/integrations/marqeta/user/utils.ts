import { getMarqetaUser, transitionMarqetaUser, updateMarqetaUser } from '.';
import { ActiveCampaignCustomFields } from '../../../lib/constants/activecampaign';
import { generateRandomPasswordString } from '../../../lib/misc';
import { IUserDocument, UserModel } from '../../../models/user';
import { IVisitorDocument, VisitorModel } from '../../../models/visitor';
import { openBrowserAndAddShareASaleCode } from '../../../services/karmaCard/utils';
import { register, checkIfUserPassedInternalKycAndUpdateMarqetaStatus, formatMarqetaClosedEmail } from '../../../services/user';
import { IEntityData } from '../../../services/user/types';
import { isUserDocument } from '../../../services/user/utils';
import { updateCustomFields } from '../../activecampaign';
import { IMarqetaUserStatus, MarqetaUserModel, IMarqetaUserTransitionsEvent, IMarqetaKycState } from './types';

export const checkIfUserActiveInMarqeta = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) console.log(`[+] No User found with this id ${userId}`);
  const { status } = await getMarqetaUser(user.integrations.marqeta.userToken);
  if (status === IMarqetaUserStatus.ACTIVE || status === IMarqetaUserStatus.LIMITED) return true;
  return false;
};

// Will occur when someone manually marks an inquiry/user as declined
export const closeMarqetaAccount = async (entityData: IEntityData) => {
  try {
    const marqetaUserToken = entityData?.data?.integrations?.marqeta?.userToken;
    if (marqetaUserToken) {
      throw new Error('User does not have a Marqeta user token');
    }

    const userInMarqeta = await getMarqetaUser(marqetaUserToken);
    if (userInMarqeta) {
      console.log(`Found user in Marqeta with id: ${marqetaUserToken}`);
      // update user status in marqeta
      if (userInMarqeta.state !== IMarqetaUserStatus.CLOSED) {
        await transitionMarqetaUser({
          channel: 'API',
          reason: 'Manual Review: Failed KYC',
          reasonCode: '17',
          status: IMarqetaUserStatus.CLOSED,
          userToken: marqetaUserToken,
        });
      }
    } else {
      console.log(`No user found in Marqeta with id: ${marqetaUserToken}`);
    }
  } catch (err) {
    console.log(`Error closing Marqeta account for user or visitor with id ${entityData.data._id.toString()}`, err);
  }
};

export const createNewUserFromMarqetaWebhook = async (visitor: IVisitorDocument) => {
  const { user } = await register({
    name: `${visitor.integrations.marqeta.first_name} ${visitor.integrations.marqeta.last_name}`,
    password: generateRandomPasswordString(14),
    visitorId: visitor._id.toString(),
    isAutoGenerated: true,
  });

  user.integrations.marqeta = visitor.integrations.marqeta;
  await user.save();
  return user;
};

export const handleMarqetaUserActiveTransition = async (user: IUserDocument) => {
  user.integrations.marqeta.kycResult = { status: IMarqetaKycState.success, codes: [] };
  user.integrations.marqeta.status = IMarqetaUserStatus.ACTIVE;
  const savedUser = await user.save();
  return savedUser;
};

export const handleMarqetaVisitorActiveTransition = async (visitor: IVisitorDocument) => {
  visitor.integrations.marqeta.kycResult = { status: IMarqetaKycState.success, codes: [] };
  visitor.integrations.marqeta.status = IMarqetaUserStatus.ACTIVE;
  const savedVisitor = await visitor.save();
  return savedVisitor;
};

const updateMarqetaUserEmail = async (userToken: string, email: string) => {
  try {
    await updateMarqetaUser(userToken, { email });
  } catch (error) {
    console.log('Error updating Marqeta user email', error);
  }
};

export const setClosedEmailAndStatusAndRemoveMarqetaIntegration = async (
  entity: IUserDocument | IVisitorDocument,
): Promise<IUserDocument | IVisitorDocument> => {
  try {
    if (entity?.integrations?.marqeta?.email.includes('+closed')) {
      console.log('Marqeta email already closed, skipping');
      return entity;
    }

    const closedEmail = formatMarqetaClosedEmail(entity?.integrations?.marqeta?.email);
    if (!closedEmail) throw new Error('No email found in marqeta integration');
    await updateMarqetaUserEmail(entity?.integrations?.marqeta?.userToken, closedEmail);
    if (entity?.integrations?.marqeta?.status !== IMarqetaUserStatus.CLOSED) {
      closeMarqetaAccount({ data: entity, type: isUserDocument(entity) ? 'user' : 'visitor' });
    }
    // remove the marqeta itegration from the user object
    entity.integrations.marqeta = undefined;

    return await entity.save();
  } catch (error) {
    console.log('Error updating Marqeta user email', error);
  }
};

// if the status is closed, add '+closed' to this email in marqeta
export const setClosedMarqetaAccountState = async (
  user: IVisitorDocument | IUserDocument,
  userTransition: Partial<IMarqetaUserTransitionsEvent>,
): Promise<void> => {
  if (!user || !userTransition?.status || userTransition?.status !== IMarqetaUserStatus.CLOSED) {
    return;
  }
  await setClosedEmailAndStatusAndRemoveMarqetaIntegration(user);
};

// Existing User withe the Marqeta Integration Already Saved
export const updateExistingUserFromMarqetaWebhook = async (
  user: IUserDocument,
  currentMarqetaUserData: MarqetaUserModel,
  webhookData: IMarqetaUserTransitionsEvent,
) => {
  user.integrations.marqeta.status = currentMarqetaUserData.status;
  await setClosedMarqetaAccountState(user, currentMarqetaUserData);
  // If reason attribute is missing in userTransition(webhook data) then populate the reson based on reson_code
  if (webhookData.status === currentMarqetaUserData.status) {
    const { reason, reason_code: reasonCode } = webhookData;
    user.integrations.marqeta.reason = !!reason ? reason : '';
    user.integrations.marqeta.reason_code = !!reasonCode ? reasonCode : '';
    await user.save();
  }

  if (currentMarqetaUserData.status === IMarqetaUserStatus.ACTIVE) {
    if (!!user.integrations?.shareasale) {
      const { sscid, xTypeParam, sscidCreatedOn, trackingId } = user.integrations.shareasale;
      await openBrowserAndAddShareASaleCode({ sscid, trackingid: trackingId, xtype: xTypeParam, sscidCreatedOn });
    }
    await handleMarqetaUserActiveTransition(user);
    await updateCustomFields(user.emails.find((e) => e.primary).email, [
      { field: ActiveCampaignCustomFields.existingWebAppUser, update: 'true' },
    ]);
  }
};
// Existing Visitor with Marqeta integration (no existing user with the Marqeta integration although there could be an existing user)
// export const updatedVisitorFromMarqetaWebhook = async (visitor: IVisitorDocument, currentMarqetaUserData: MarqetaUserModel) => {
//   if (currentMarqetaUserData.status === IMarqetaUserStatus.ACTIVE) {
//     if (!visitor.user) {
//       // Visitor only created
//       const user = await createNewUserFromMarqetaWebhook(visitor);
//       await handleMarqetaUserActiveTransition(user);
//     } else {
//       // Visitor created a KW account after being declined for a KW card
//       // Marqeta integration only saved on visitor not on user yet
//       // If they are now in an active state, we need to add integration to the user and send out welcome email and order cards
//       const user = await UserModel.findById(visitor.user);
//       if (!user) throw new CustomError('[+] User Id associated with visitor not found in database', ErrorTypes.NOT_FOUND);
//       await handleMarqetaUserActiveTransition(user);
//     }
//   }
// };

export const handleMarqetaUserTransitionWebhook = async (userTransition: IMarqetaUserTransitionsEvent) => {
  const existingUser = await UserModel.findOne({ 'integrations.marqeta.userToken': userTransition?.user_token });
  const visitor = await VisitorModel.findOne({ 'integrations.marqeta.userToken': userTransition?.user_token });
  const foundEntity = !!existingUser ? existingUser : visitor;

  if (!foundEntity) {
    console.log('[+] User or Visitor with matching token not found');
    return;
  }

  const userPassedInternalKyc = await checkIfUserPassedInternalKycAndUpdateMarqetaStatus(foundEntity);

  if (!userPassedInternalKyc) {
    console.log('[+] User or Visitor did not pass internal KYC, do not do anything else');
    return;
  }

  // grab the user data from Marqeta directly since webhooks can come in out of order
  const currentMarqetaUserData = await getMarqetaUser(userTransition?.user_token);

  if (!currentMarqetaUserData) {
    console.log('[+] Error getting most up to date user information from Marqeta');
  }

  if (!!existingUser?._id && existingUser?.integrations?.marqeta?.status !== currentMarqetaUserData?.status) {
    await updateExistingUserFromMarqetaWebhook(existingUser, currentMarqetaUserData, userTransition);
  } else if (!!existingUser?._id && currentMarqetaUserData?.status === IMarqetaUserStatus.ACTIVE) {
    await updateExistingUserFromMarqetaWebhook(existingUser, currentMarqetaUserData, userTransition);
  }

  // EXISTING VISITOR, Marqeta integration is saved on the visitor object,
  if (!!visitor?._id && !existingUser?._id) {
    await handleMarqetaVisitorActiveTransition(visitor);
    await setClosedMarqetaAccountState(visitor, currentMarqetaUserData);
  }
};
