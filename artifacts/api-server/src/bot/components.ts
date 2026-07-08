import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { C } from "./colors.js";

export interface ContainerPayload {
  flags: number;
  components: ContainerBuilder[];
  allowedMentions: { parse: []; repliedUser: false };
}

export function buildActionContainer(
  title: string,
  lines: string[],
  footer: string,
): ContainerPayload {
  const container = new ContainerBuilder().setAccentColor(C.yellow);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}`),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.map((l) => `> ${l}`).join("\n")),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ◈  ${footer}`),
  );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  };
}
