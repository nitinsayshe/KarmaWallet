import { SlackClient } from '../../clients/slack';

export const getSlackChannelId = async (channelName: string) => {
  const channels = await SlackClient.conversations.list();
  return channels.channels.find((channel) => channel.name === channelName)?.id;
};
