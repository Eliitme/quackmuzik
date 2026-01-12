import { Client, GatewayIntentBits } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import * as dotenv from 'dotenv';
import { registerEvents } from './events';

dotenv.config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Lavalink manager
const lavalinkManager = new LavalinkManager({
  nodes: [
    {
      authorization: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      host: process.env.LAVALINK_HOST || 'lavalink',
      port: parseInt(process.env.LAVALINK_PORT || '2333'),
      id: 'main-node',
    },
  ],
  sendToShard: (guildId, payload) => {
    return client.guilds.cache.get(guildId)?.shard?.send(payload);
  },
  client: {
    id: process.env.DISCORD_CLIENT_ID || '',
    username: 'QuackMuzik',
  },
  queueOptions: {
    maxPreviousTracks: 0, // không lưu cache
  },
});

// Register all event handlers
registerEvents(client, lavalinkManager);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
