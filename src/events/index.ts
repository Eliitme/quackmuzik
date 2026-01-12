import { Client } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { registerReadyEvent } from './ready';
import { registerRawEvent } from './raw';
import { registerMessageCreateEvent } from './messageCreate';
import { registerLavalinkEvents } from './lavalink';
import { registerInteractionCreateEvent } from './interactionCreate';

/**
 * Register all event handlers
 */
export function registerEvents(client: Client, lavalinkManager: LavalinkManager): void {
  registerReadyEvent(client, lavalinkManager);
  registerRawEvent(client, lavalinkManager);
  registerMessageCreateEvent(client, lavalinkManager);
  registerLavalinkEvents(client, lavalinkManager);
  registerInteractionCreateEvent(client, lavalinkManager);
}
