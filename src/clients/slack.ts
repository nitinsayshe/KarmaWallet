import { WebClient } from '@slack/web-api';

const { SLACK_TOKEN } = process.env;

export const SlackClient = new WebClient(SLACK_TOKEN);
