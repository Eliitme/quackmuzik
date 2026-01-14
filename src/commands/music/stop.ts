import { Command } from '../../types/Command';
import { translate } from '../../utils/i18n';
import { getCommandContext, getAndValidatePlayer } from '../../utils/musicHelpers';

export const stopCommand: Command = {
  name: 'stop',
  description: 'Dừng phát nhạc và rời khỏi voice channel',
  usage: '!stop',
  aliases: ['leave', 'disconnect'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const { locale } = await getCommandContext(message.guild?.id || null);
    const player = await getAndValidatePlayer(
      lavalinkManager,
      message.guild!.id,
      locale,
      'stop',
      message,
      false
    );

    if (!player) {
      return;
    }

    await player.destroy();
    await message.reply(translate(locale, 'commands.stop.stopped'));
  },
};
