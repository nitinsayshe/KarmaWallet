import { SlackClient } from '../../clients/slack';
import { SlackChannelNameEnum } from '../../lib/constants';

export const getSlackChannelId = async (channelName: string) => {
  const channels = await SlackClient.conversations.list();
  return channels.channels.find((channel) => channel.name === channelName)?.id;
};

export const getTransactionAlertChannelIdFromEnvironment = async () => {
  if (process.env.NODE_ENV === 'production') {
    return getSlackChannelId(SlackChannelNameEnum.ProdTransactionAlerts);
  }
  if (process.env.NODE_ENV === 'staging') {
    return getSlackChannelId(SlackChannelNameEnum.StagingTransactionAlerts);
  }
  console.log(`Not logging transaction alert in this environment: ${process.env.NODE_ENV}`);
  return null;
};

export const sendTransactionAlertMessage = async (message: string) => {
  const channelId = await getTransactionAlertChannelIdFromEnvironment();
  if (!channelId) {
    return;
  }
  await SlackClient.chat.postMessage({
    channel: channelId,
    text: message,
  });
};
