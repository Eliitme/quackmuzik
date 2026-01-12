import { PermissionFlagsBits, Role } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  getGuildDjRole,
  setGuildDjRole,
  resetGuildDjRole,
  getGuildPrefix,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, type Locale } from '../../utils/i18n';

export const djroleCommand: Command = {
  name: 'djrole',
  description: 'View or set DJ role for vote skip bypass',
  usage: 'djrole [role mention or role ID]',
  aliases: ['dj', 'setdj'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // If no args, display current DJ role
    if (args.length === 0) {
      const currentDjRoleId = await getGuildDjRole(guildId);
      const embed = createEmbed({
        title: translate(locale, 'commands.djrole.current_title'),
        description: translate(locale, 'commands.djrole.current_description'),
      });

      if (currentDjRoleId) {
        const role = message.guild!.roles.cache.get(currentDjRoleId);
        if (role) {
          embed.addFields({
            name: translate(locale, 'commands.djrole.current_role'),
            value: `${role} (${role.name})`,
            inline: false,
          });
        } else {
          // Role was deleted
          embed.addFields({
            name: translate(locale, 'commands.djrole.current_role'),
            value: translate(locale, 'commands.djrole.role_not_found'),
            inline: false,
          });
        }
      } else {
        embed.addFields({
          name: translate(locale, 'commands.djrole.current_role'),
          value: translate(locale, 'commands.djrole.no_role_set'),
          inline: false,
        });
      }

      const prefix = await getGuildPrefix(guildId);
      embed.addFields({
        name: translate(locale, 'commands.djrole.how_to_set'),
        value: translate(locale, 'commands.djrole.set_instruction', {
          prefix,
        }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Set or remove DJ role
    const input = args[0].trim().toLowerCase();

    // Check if user wants to remove/clear DJ role
    if (input === 'none' || input === 'clear' || input === 'remove' || input === 'reset') {
      try {
        await resetGuildDjRole(guildId);
        const embed = createEmbed({
          title: translate(locale, 'commands.djrole.removed_title'),
          description: translate(locale, 'commands.djrole.removed_description'),
          color: '#00FF00',
        });

        await message.reply({ embeds: [embed] });
      } catch (error) {
        logger.error('Error removing DJ role', { guildId, error });
        await message.reply(translate(locale, 'commands.djrole.error'));
      }
      return;
    }

    // Try to parse role from mention or ID
    let role: Role | undefined;

    // Check for role mention
    const roleMention = message.mentions.roles.first();
    if (roleMention) {
      role = roleMention;
    } else {
      // Try to parse as role ID
      const roleId = args[0].trim();
      if (roleId.match(/^\d+$/)) {
        role = message.guild!.roles.cache.get(roleId);
      } else {
        // Try to find by name (case-insensitive)
        role = message.guild!.roles.cache.find((r) => r.name.toLowerCase() === input);
      }
    }

    if (!role) {
      await message.reply(translate(locale, 'commands.djrole.role_not_found'));
      return;
    }

    try {
      await setGuildDjRole(guildId, role.id);
      const embed = createEmbed({
        title: translate(locale, 'commands.djrole.set_title'),
        description: translate(locale, 'commands.djrole.set_description', {
          role: role.toString(),
        }),
        color: '#00FF00',
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting DJ role', { guildId, roleId: role.id, error });
      await message.reply(translate(locale, 'commands.djrole.error'));
    }
  },
};
