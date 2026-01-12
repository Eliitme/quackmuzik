import { Command } from '../../types/Command';
import { getGuildPrefix, getGuildLocale } from '../../utils/database';
import { createEmbed, createEmbedWithCustomFooter } from '../../utils/embed';
import { translate, getTranslations, type Locale } from '../../utils/i18n';
import { isBotOwner } from '../../utils/permissions';

export const helpCommand: Command = {
  name: 'help',
  description: 'Hiển thị danh sách lệnh và hướng dẫn sử dụng',
  usage: 'help [tên lệnh]',
  aliases: ['h', 'commands'],
  category: 'admin',

  async execute({ message, args }) {
    // Lấy prefix và locale từ database
    const prefix = await getGuildPrefix(message.guild?.id || null);
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;

    // Import commands ở đây để tránh circular dependency
    const { commands } = await import('../index');

    // Nếu có args, hiển thị help cho command cụ thể
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName);

      if (!command) {
        const t = translate(locale, 'commands.help.not_found', { command: commandName });
        await message.reply(t);
        return;
      }

      // Format usage với prefix động
      const usageWithPrefix = command.usage.startsWith(prefix)
        ? command.usage
        : `${prefix}${command.usage}`;

      // Lấy translations cho command này
      const commandT = getTranslations(locale, `commands.${command.name}`);
      const helpT = getTranslations(locale, 'commands.help');

      const embed = createEmbed({
        title: translate(locale, 'commands.help.command_title', { name: command.name }),
        description: commandT.description || command.description,
      }).addFields({
        name: translate(locale, 'commands.help.usage_label'),
        value: `\`${usageWithPrefix}\``,
        inline: false,
      });

      if (command.aliases && command.aliases.length > 0) {
        embed.addFields({
          name: translate(locale, 'commands.help.aliases_label'),
          value: command.aliases.map((a: string) => `\`${a}\``).join(', '),
          inline: false,
        });
      }

      await message.reply({ embeds: [embed] });
      return;
    }

    // Hiển thị tất cả commands theo category
    const uniqueCommands = new Map<string, Command>();
    commands.forEach((command: Command) => {
      if (!uniqueCommands.has(command.name)) {
        uniqueCommands.set(command.name, command);
      }
    });

    // Group commands by category
    const commandsByCategory = new Map<
      'music' | 'admin' | 'system',
      Array<{ command: Command; aliases: string }>
    >();

    uniqueCommands.forEach((command) => {
      const aliases =
        command.aliases && command.aliases.length > 0
          ? command.aliases.map((a) => `\`${a}\``).join(', ')
          : '';

      if (!commandsByCategory.has(command.category)) {
        commandsByCategory.set(command.category, []);
      }
      commandsByCategory.get(command.category)!.push({ command, aliases });
    });

    const helpT = getTranslations(locale, 'commands.help');
    const prefixLabel = translate(locale, 'common.prefix_label', { prefix });

    const embed = createEmbedWithCustomFooter(prefixLabel, {
      title: translate(locale, 'commands.help.title'),
      description: translate(locale, 'commands.help.description_full', { prefix }),
    });

    // Display commands by category
    const categoryOrder: Array<'music' | 'admin' | 'system'> = ['music', 'admin', 'system'];
    const isOwner = isBotOwner(message.author.id);

    categoryOrder.forEach((category) => {
      // Skip system category if user is not owner
      if (category === 'system' && !isOwner) return;

      const categoryCommands = commandsByCategory.get(category);
      if (!categoryCommands || categoryCommands.length === 0) return;

      const categoryName = translate(locale, `common.categories.${category}`);
      let categoryValue = '';

      categoryCommands.forEach(({ command, aliases }) => {
        const commandT = getTranslations(locale, `commands.${command.name}`);
        const description = commandT.description || command.description;

        const aliasesText = aliases ? ` (${aliases})` : '';
        categoryValue += `\`${prefix}${command.name}\`${aliasesText} - ${description}\n`;
      });

      embed.addFields({
        name: categoryName,
        value: categoryValue.trim(),
        inline: false,
      });
    });

    await message.reply({ embeds: [embed] });
  },
};
