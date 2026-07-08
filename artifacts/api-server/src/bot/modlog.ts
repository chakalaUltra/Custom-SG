import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { sendModLog } from "./store.js";
import { E } from "./emojis.js";
import { C } from "./colors.js";

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
  const ts = Math.floor(Date.now() / 1000);

  const container = new ContainerBuilder().setAccentColor(C.yellow);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${emoji}  ${type.toUpperCase()}\n-# Moderation Log  ·  <t:${ts}:f>`,
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const fields = [
    `${E.info}  **Target** — ${targetTag}  \`${targetId}\``,
    `${E.userConfig}  **Moderator** — ${moderatorTag}`,
  ];
  if (opts?.reason) fields.push(`${E.bell}  **Reason** — ${opts.reason}`);
  if (opts?.extra)  fields.push(`${E.message}  **Details** — ${opts.extra}`);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(fields.map((f) => `> ${f}`).join("\n")),
  );

  await sendModLog(guildId, container);
}
