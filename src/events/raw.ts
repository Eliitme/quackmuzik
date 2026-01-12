import { Client } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';

/**
 * Raw Discord event handler
 * Forwards raw Discord events to Lavalink
 */
export function registerRawEvent(client: Client, lavalinkManager: LavalinkManager): void {
  client.on('raw', (d) => {
    lavalinkManager.sendRawData(d);
  });
}
