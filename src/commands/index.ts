import { Command } from '../types/Command';

// Music commands
import { playCommand } from './music/play';
import { stopCommand } from './music/stop';
import { skipCommand } from './music/skip';
import { seekCommand } from './music/seek';
import { jumpCommand } from './music/jump';
import { queueCommand } from './music/queue';
import { nowPlayingCommand } from './music/nowplaying';
import { speakCommand } from './music/speak';
import { playlistCommand } from './music/playlist';

// Admin commands
import { helpCommand } from './admin/help';
import { prefixCommand } from './admin/prefix';
import { localeCommand } from './admin/locale';
import { termsCommand } from './admin/terms';
import { djroleCommand } from './admin/djrole';
import { mode247Command } from './admin/247mode';

// System commands
// import { debugCommand } from './system/debug'; // OPTIONAL: Uncomment to enable debug command
import { guildsCommand } from './system/guilds';

// Registry containing all commands
export const commands: Map<string, Command> = new Map();

// Register commands
const commandList = [
  playCommand,
  stopCommand,
  helpCommand,
  nowPlayingCommand,
  queueCommand,
  skipCommand,
  jumpCommand,
  seekCommand,
  speakCommand,
  playlistCommand,
  prefixCommand,
  localeCommand,
  termsCommand,
  djroleCommand,
  mode247Command,
  guildsCommand,
  // debugCommand, // OPTIONAL: Uncomment to enable debug command
];

commandList.forEach((command) => {
  commands.set(command.name, command);

  // Register aliases
  if (command.aliases) {
    command.aliases.forEach((alias) => {
      commands.set(alias, command);
    });
  }
});

export { Command };
