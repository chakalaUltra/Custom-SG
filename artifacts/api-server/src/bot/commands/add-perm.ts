import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  Message,
  type GuildTextBasedChannel,
} from "discord.js";
import { saveCommandPerm } from "../store.js";
import { buildActionContainer } from "../components.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "add-perm";

const ADMIN_ONLY_COMMANDS = ["add-perm", "modlogs"];

const GRANTABLE_COMMANDS = [
  "verify-roles",
  "verify",
  "mainer",
  "warn",
  "warnings",
  "dewarn",
  "mute",
  "unmute",
  "ban",
  "unban",
  "kick",
  "modinfo",
  "role",
  "rank",
  "rank-roles",
  "leaderboard",
  "userinfo",
];

export const data = new SlashCommandBuilder()
  .setName("add-perm")
  .setDescription("Grant a role access to a specific bot command (admin only)")
  .addRoleOption((opt) =>
    opt
      .setName("role")
      .setDescription("The role to grant access to")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("command")
      .setDescription("The command name to grant")
      .setRequired(true)
      .addChoices(
        ...GRANTABLE_COMMANDS.map((c) => ({ name: c, value: c })),
      ),
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
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: `${E.cross} Only administrators can use this command.`, ephemeral: true });
    return;
  }

  const role = interaction.options.getRole("role", true);
  const command = interaction.options.getString("command", true);

  if (ADMIN_ONLY_COMMANDS.includes(command)) {
    await interaction.reply({
      content: `${E.cross} \`${command}\` is strictly admin-only and cannot be granted to a role.`,
      ephemeral: true,
    });
    return;
  }

  await saveCommandPerm(interaction.guild.id, role.id, command);

  await interaction.reply(
    buildActionContainer(
      `${E.plus} Permission Granted`,
      [`<@&${role.id}> can now use **/${command}**.`],
      `By ${executor.user.tag}`,
    ),
  );
}

export async function runAddPerm(
  message: Message,
  executor: GuildMember,
  args: string[],
): Promise<void> {
  if (!message.guild) return;

  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await message.reply(`${E.cross} Only administrators can use this command.`);
    return;
  }

  if (args.length < 2) {
    await message.reply(`${E.cross} Usage: \`$add-perm @role <command>\`\nGrantable commands: ${GRANTABLE_COMMANDS.join(", ")}`);
    return;
  }

  const roleResolvable = args[0];
  const command = args[1].toLowerCase();

  if (ADMIN_ONLY_COMMANDS.includes(command)) {
    await message.reply(`${E.cross} \`${command}\` is strictly admin-only and cannot be granted to a role.`);
    return;
  }

  if (!GRANTABLE_COMMANDS.includes(command)) {
    await message.reply(`${E.cross} Unknown command \`${command}\`. Grantable commands: ${GRANTABLE_COMMANDS.join(", ")}`);
    return;
  }

  const roleIdMatch = roleResolvable.match(/^<@&(\d+)>$/) ?? roleResolvable.match(/^(\d+)$/);
  if (!roleIdMatch) {
    await message.reply(`${E.cross} Please mention a role or provide a role ID.`);
    return;
  }

  const roleId = roleIdMatch[1];
  const role = await message.guild.roles.fetch(roleId).catch(() => null);
  if (!role) {
    await message.reply(`${E.cross} Could not find that role.`);
    return;
  }

  await saveCommandPerm(message.guild.id, role.id, command);

  await (message.channel as GuildTextBasedChannel).send(
    buildActionContainer(
      `${E.plus} Permission Granted`,
      [`<@&${role.id}> can now use **/${command}**.`],
      `By ${executor.user.tag}`,
    ),
  );
}
