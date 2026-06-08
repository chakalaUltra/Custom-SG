import { EmbedBuilder } from "discord.js";
import { sendModLog } from "./store.js";
import { E } from "./emojis.js";
import { C } from "./colors.js";

const ACTION_COLORS: Record<string, number> = {
  warn:   C.actWarn,
  dewarn: C.actDewarn,
  kick:   C.actKick,
  ban:    C.actBan,
  unban:  C.actUnban,
  mute:   C.actMute,
  unmute: C.actUnmute,
  verify: C.actVerify,
  mainer: C.actMainer,
  role:   C.actRole,
  rank:   C.actRank,
};

const ACTION_EMOJI: Record<string, string> = {
  warn:   E.info,
  dewarn: E.trash,
  kick:   E.left,
  ban:    E.cross,
  unban:  E.check,
  mute:   E.bell,
  unmute: E.bell,
  verify: E.shield,
  mainer: E.star,
  role:   E.sliders,
  rank:   E.chart,
};

export async function dispatchModLog(
  guildId: string,
  type: string,
  targetTag: string,
  targetId: string,
  moderatorTag: string,
  opts?: { reason?: string; extra?: string },
): Promise<void> {
  const emoji = ACTION_EMOJI[type] ?? E.message;
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
