import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from "discord.js";

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
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  for (const line of lines) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(line),
    );
  }
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${footer}`),
  );
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  };
}
