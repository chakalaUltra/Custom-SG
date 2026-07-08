import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { getWarnings } from "../store.js";
import { canRunCommand } from "../permissions.js";
import { E } from "../emojis.js";
import { C } from "../colors.js";

export const COMMAND_NAME = "warnings";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("View all warnings for a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to look up").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: `${E.cross} Server only.`, ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!canRunCommand(executor, COMMAND_NAME)) {
    await interaction.reply({ content: `${E.cross} You do not have permission to use this command.`, ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  await interaction.deferReply();
  await runWarnings(interaction.guild.id, targetUser.id, targetUser.tag, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runWarnings(
  guildId: string,
  targetId: string,
  targetTag: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const warnings = getWarnings(guildId, targetId);

  if (warnings.length === 0) {
    const container = new ContainerBuilder().setAccentColor(C.yellow);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${E.check}  Warnings — ${targetTag}\n-# No warnings on record`,
      ),
    );
    await replyFn({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { parse: [], repliedUser: false },
    });
    return;
  }

  const container = new ContainerBuilder().setAccentColor(C.yellow);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.bell}  Warnings — ${targetTag}\n-# ${warnings.length} warning${warnings.length === 1 ? "" : "s"} on record`,
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i]!;
    const ts = Math.floor(w.timestamp / 1000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**[${i + 1}]**  ${w.reason}\n-# <t:${ts}:f>  ·  by ${w.moderatorTag}`,
      ),
    );
    if (i < warnings.length - 1) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
      );
    }
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ◈  ${warnings.length} warning${warnings.length === 1 ? "" : "s"} total  ·  <@${targetId}>`),
  );

  await replyFn({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  });
}
