import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from "discord.js";
import { getWarnings } from "../store.js";
import { canRunCommand } from "../permissions.js";

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
    await interaction.reply({ content: "❌ Server only.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!canRunCommand(executor, COMMAND_NAME)) {
    await interaction.reply({ content: "❌ You do not have permission to use this command.", ephemeral: true });
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
    await replyFn({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 📋 Warnings for ${targetTag}\nNo warnings on record.`),
        ),
      ],
      allowedMentions: { parse: [], repliedUser: false },
    });
    return;
  }

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ⚠️ Warnings for ${targetTag}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i];
    const date = new Date(w.timestamp);
    const dateStr = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**[${i + 1}]** ${w.reason}\n-# ${dateStr} at ${timeStr} — by ${w.moderatorTag}`,
      ),
    );
    if (i < warnings.length - 1) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
    }
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${warnings.length} warning${warnings.length === 1 ? "" : "s"} total`),
  );

  await replyFn({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  });
}
