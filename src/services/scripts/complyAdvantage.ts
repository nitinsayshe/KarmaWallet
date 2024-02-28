import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import dayjs from 'dayjs';
import { UserModel } from '../../models/user';
import { performInternalKyc } from '../karmaCard';
import { monitorComplyAdvantageSearch } from '../../integrations/complyAdvantage';
import { sleep } from '../../lib/misc';
import { ServerModel, ServerSourcesEnum, ServerTypesEnum } from '../../models/server';

const sleepTimeMs = 500;
export const activateMonitoredComplyAdvantageSearchesForKWCardUsers = async () => {
  const usersWithMatches: { firstName: string; lastName: string; karmaUserId: string; complyAdvantageClientReference: string }[] = [];
  const usersWithErrors: { firstName: string; lastName: string; karmaUserId: string }[] = [];
  // pull all users with marqeta integrations
  const usersWithMarqetaIntegrations = await UserModel.find({
    $and: [{ 'integrations.marqeta': { $exists: true } }, { 'integrations.marqeta.userToken': { $exists: true } }],
  });

  if (!usersWithMarqetaIntegrations || !usersWithMarqetaIntegrations?.length || usersWithMarqetaIntegrations.length === 0) {
    console.log('No users with marqeta integrations found');
    return;
  }
  // create a search for each user in comply advantage
  const updatedUsers = [];
  for (const user of usersWithMarqetaIntegrations) {
    const updatedUser = await performInternalKyc(user, {
      firstName: user?.integrations?.marqeta?.first_name,
      lastName: user?.integrations?.marqeta?.last_name,
      birthYear: dayjs(user.integrations.marqeta.birth_date).year(),
    });
    if (!updatedUser) {
      // get updated user
      const updatedFailedUser = await UserModel.findById(user._id);

      if (!updatedFailedUser?.integrations?.complyAdvantage?.client_ref) {
        console.log(`[!] Error updating user ${user._id.toString()}`);
        usersWithErrors.push({
          firstName: user.integrations.marqeta.first_name,
          lastName: user.integrations.marqeta.last_name,
          karmaUserId: user._id.toString(),
        });
      }
      console.log(`User matches found ${user._id.toString()}`);
      usersWithMatches.push({
        firstName: user.integrations.marqeta.first_name,
        lastName: user.integrations.marqeta.last_name,
        karmaUserId: user._id.toString(),
        complyAdvantageClientReference: updatedFailedUser.integrations.complyAdvantage.client_ref,
      });
    } else {
      // create a monitor for the user
      const monitorRes = await monitorComplyAdvantageSearch(updatedUser.integrations.complyAdvantage.id);
      if (!monitorRes) {
        console.log(`[!] Error monitoring user ${user._id.toString()}`);
      }
      updatedUsers.push(updatedUser);
    }
    await sleep(sleepTimeMs);
  }
  console.log('users with errors: ', usersWithErrors.length);
  console.log('users with matches: ', usersWithMatches.length);

  if (usersWithErrors.length > 0) {
    const errorsCsv = parse(usersWithErrors);
    console.log('writing errors to file');
    fs.writeFileSync(path.join(__dirname, '.tmp', 'users_with_comply_advantage_errors.csv'), errorsCsv);
  }

  if (usersWithMatches.length > 0) {
    console.log('writing matchesto file');
    const matchesCsv = parse(usersWithMatches);
    fs.writeFileSync(path.join(__dirname, '.tmp', 'users_with_comply_advantage_matches.csv'), matchesCsv);
  }

  console.log(`updated ${updatedUsers.length} users`);
};

// Script for registering whitelisted servers
// IPs taken from https://docs.complyadvantage.com/api-docs/?_ga=2.188571051.2052295075.1638190767-1892350473.1619086178#source-ip-addresses
const ComplyAdvantageServers = ['3.216.162.15', '3.214.3.128', '52.73.76.4'];

export const registerWhitelistedServers = async () => {
  for (const server of ComplyAdvantageServers) {
    try {
      const whitelistedServer = new ServerModel({
        ip: server,
        source: ServerSourcesEnum.ComplyAdvantage,
        type: ServerTypesEnum.Whitelist,
      });

      await whitelistedServer.save();
      console.log(`Server ${server} registered`);
    } catch (e) {
      console.log(`Error registering server ${server}`);
    }
  }
};
