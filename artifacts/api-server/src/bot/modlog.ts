import { EmbedBuilder } from "discord.js";
import { sendModLog } from "./store.js";

const ACTION_COLORS: Record<string, number> = {
  warn: 0xff9900,
  dewarn: 0x00aaff,
  kick: 0xffcc00,
  ban: 0xff4444,
  unban: 0x44ff88,
  mute: 0x9944ff,
  unmute: 0x44aaff,
  verify: 0x44cc44,
  mainer: 0xffd700,
};

const ACTION_EMOJI: Record<string, string> = {
  warn: "⚠️",
  dewarn: "🗑️",
  kick: "👢",
  ban: "🔨",
  unban: "🔓",
  mute: "🔇",
  unmute: "🔊",
  verify: "✅",
  mainer: "⭐",
};

export async function dispatchModLog(
  guildId: string,
  type: string,
  targetTag: string,
  targetId: string,
  moderatorTag: string,
  opts?: { reason?: string; extra?: string },
): Promise<void> {
  const emoji = ACTION_EMOJI[type] ?? "📋";
  const color = ACTION_COLORS[type] ?? 0x7289da;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${type.toUpperCase()}`)
    .addFields(
      { name: "User", value: `${targetTag} (\`${targetId}\`)`, inline: true },
      { name: "Moderator", value: moderatorTag, inline: true },
    )
    .setTimestamp();

  if (opts?.reason) embed.addFields({ name: "Reason", value: opts.reason });
  if (opts?.extra) embed.addFields({ name: "Details", value: opts.extra });

  await sendModLog(guildId, embed.toJSON());
}
