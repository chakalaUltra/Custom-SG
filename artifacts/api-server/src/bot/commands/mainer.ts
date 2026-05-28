import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { getVerifyRoles } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";

export const COMMAND_NAME = "mainer";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription(
    "Grant mainer status — gives mainer + verified roles, removes unverified",
  )
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("The user to grant mainer status")
      .setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const executor = interaction.member as GuildMember;
  if (!canRunCommand(executor, COMMAND_NAME)) {
    await interaction.reply({
      content: "❌ You do not have permission to use this command.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const config = getVerifyRoles(interaction.guild.id);
  if (!config) {
    await interaction.editReply({
      content:
        "❌ Verification roles are not configured yet. Use `/verify-roles` first.",
    });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const target = await interaction.guild.members
    .fetch(targetUser.id)
    .catch(() => null);
  if (!target) {
    await interaction.editReply({
      content: "❌ Could not find that user in this server.",
    });
    return;
  }

  try {
    await target.roles.add([config.verifiedRoleId, config.mainerRoleId]);
    await target.roles.remove(config.unverifiedRoleId).catch(() => {});
  } catch {
    await interaction.editReply({
      content:
        "❌ Failed to modify roles. Ensure the bot has **Manage Roles** and its role is above the target roles.",
    });
    return;
  }

  const payload = buildActionContainer("⭐ Mainer Status Granted", [
    `**${target.user.tag}** is now a certified mainer!`,
    `Granted <@&${config.verifiedRoleId}> + <@&${config.mainerRoleId}> and removed from <@&${config.unverifiedRoleId}>.`,
    `Granted by: ${interaction.user}`,
  ]);

  await interaction.editReply(payload);
}

export async function runMainer(
  guildMember: GuildMember,
  executor: GuildMember,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const config = getVerifyRoles(guildMember.guild.id);
  if (!config) {
    await replyFn({
      content:
        "❌ Verification roles are not configured yet. Use `/verify-roles` first.",
    });
    return;
  }

  try {
    await guildMember.roles.add([config.verifiedRoleId, config.mainerRoleId]);
    await guildMember.roles.remove(config.unverifiedRoleId).catch(() => {});
  } catch {
    await replyFn({
      content:
        "❌ Failed to modify roles. Ensure the bot has **Manage Roles** and its role is above the target roles.",
    });
    return;
  }

  const payload = buildActionContainer("⭐ Mainer Status Granted", [
    `**${guildMember.user.tag}** is now a certified mainer!`,
    `Granted <@&${config.verifiedRoleId}> + <@&${config.mainerRoleId}> and removed from <@&${config.unverifiedRoleId}>.`,
    `Granted by: ${executor.user.tag}`,
  ]);

  await replyFn(payload);
}
