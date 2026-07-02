import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
} from "discord.js";
import { sendModLog } from "./store.js";
import { E } from "./emojis.js";

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

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${emoji}  ${type.toUpperCase()}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${E.info}  **User:** ${targetTag} (\`${targetId}\`)\n` +
      `${E.sliders}  **Moderator:** ${moderatorTag}`,
    ),
  );
  if (opts?.reason) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${E.bell}  **Reason:** ${opts.reason}`),
    );
  }
  if (opts?.extra) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${E.message}  **Details:** ${opts.extra}`),
    );
  }
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# <t:${ts}:f>`),
  );

  await sendModLog(guildId, container);
}
