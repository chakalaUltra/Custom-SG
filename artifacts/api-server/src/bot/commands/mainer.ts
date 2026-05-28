import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { getVerifyRoles, saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "mainer";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Grant mainer status — gives mainer + verified roles, removes unverified")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to grant mainer status").setRequired(true),
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

  await interaction.deferReply();

  const config = getVerifyRoles(interaction.guild.id);
  if (!config) {
    await interaction.editReply({ content: `${E.cross} Verification roles are not configured yet. Use \`/verify-roles\` first.` });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: `${E.cross} Could not find that user in this server.` });
    return;
  }

  try {
    await target.roles.add([config.verifiedRoleId, config.mainerRoleId]);
    await target.roles.remove(config.unverifiedRoleId).catch(() => {});
  } catch {
    await interaction.editReply({ content: `${E.cross} Failed to modify roles. Ensure the bot has **Manage Roles** and its role is above the target roles.` });
    return;
  }

  await saveModAction(interaction.guild.id, {
    id: generateId(),
    type: "mainer",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: target.id,
    targetTag: target.user.tag,
    timestamp: Date.now(),
  });
  await dispatchModLog(interaction.guild.id, "mainer", target.user.tag, target.id, executor.user.tag);

  await interaction.editReply(
    buildActionContainer(
      `${E.star} Mainer Status Granted`,
      [`**${target.user.tag}** is now a mainer.`],
      `Granted by ${executor.user.tag}`,
    ),
  );
}

export async function runMainer(
  guildMember: GuildMember,
  executor: GuildMember,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const config = getVerifyRoles(guildMember.guild.id);
  if (!config) {
    await replyFn({ content: `${E.cross} Verification roles are not configured yet. Use \`/verify-roles\` first.` });
    return;
  }

  try {
    await guildMember.roles.add([config.verifiedRoleId, config.mainerRoleId]);
    await guildMember.roles.remove(config.unverifiedRoleId).catch(() => {});
  } catch {
    await replyFn({ content: `${E.cross} Failed to modify roles. Ensure the bot has **Manage Roles** and its role is above the target roles.` });
    return;
  }

  await saveModAction(guildMember.guild.id, {
    id: generateId(),
    type: "mainer",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: guildMember.id,
    targetTag: guildMember.user.tag,
    timestamp: Date.now(),
  });
  await dispatchModLog(guildMember.guild.id, "mainer", guildMember.user.tag, guildMember.id, executor.user.tag);

  await replyFn(
    buildActionContainer(
      `${E.star} Mainer Status Granted`,
      [`**${guildMember.user.tag}** is now a mainer.`],
      `Granted by ${executor.user.tag}`,
    ),
  );
}
