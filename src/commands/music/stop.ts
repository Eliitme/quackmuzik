import { Command } from '../../types/Command';
import { getGuildLocale } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';

export const stopCommand: Command = {
  name: 'stop',
  description: 'Dừng phát nhạc và rời khỏi voice channel',
  usage: '!stop',
  aliases: ['leave', 'disconnect'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player) {
      await message.reply(translate(locale, 'commands.stop.not_playing'));
      return;
    }

    await player.destroy();
    await message.reply(translate(locale, 'commands.stop.stopped'));
  },
};
