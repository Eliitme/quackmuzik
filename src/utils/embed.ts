import { EmbedBuilder, ColorResolvable } from 'discord.js';

const DEFAULT_FOOTER = 'Develop by eliitme with luv';
const DEFAULT_COLOR = '#00D9FF' as ColorResolvable;

/**
 * Tạo base embed với footer mặc định
 */
export function createEmbed(options?: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  footer?: string;
  timestamp?: boolean;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(options?.color || DEFAULT_COLOR);

  if (options?.title) {
    embed.setTitle(options.title);
  }

  if (options?.description) {
    embed.setDescription(options.description);
  }

  // Set footer - nếu có custom footer thì dùng, không thì dùng default
  const footerText = options?.footer || DEFAULT_FOOTER;
  embed.setFooter({ text: footerText });

  if (options?.timestamp !== false) {
    embed.setTimestamp();
  }

  return embed;
}

/**
 * Tạo embed với footer custom (append vào default footer)
 */
export function createEmbedWithCustomFooter(
  customFooter: string,
  options?: {
    title?: string;
    description?: string;
    color?: ColorResolvable;
    timestamp?: boolean;
  }
): EmbedBuilder {
  const footerText = `${customFooter} • ${DEFAULT_FOOTER}`;
  return createEmbed({
    ...options,
    footer: footerText,
  });
}

