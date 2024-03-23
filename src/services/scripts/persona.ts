// Script for registering whitelisted servers

import { ServerModel, ServerSourcesEnum, ServerTypesEnum } from '../../models/server';

const PersonaServers = [
  '35.232.44.140',
  '34.69.131.123',
  '34.67.4.225',
  '34.66.30.174',
  '34.123.74.158',
  '34.41.116.165',
  '34.145.62.98',
  '34.105.116.226',
  '34.168.249.74',
  '35.199.156.187',
  '34.105.58.25',
  '35.230.80.200',
];

export const registerWhitelistedPersonaServers = async () => {
  for (const server of PersonaServers) {
    try {
      const whitelistedServer = new ServerModel({
        ip: server,
        source: ServerSourcesEnum.Persona,
        type: ServerTypesEnum.Whitelist,
      });

      await whitelistedServer.save();
      console.log(`Persona Server ${server} registered`);
    } catch (e) {
      console.log(`Error registering server ${server}`);
    }
  }
};
