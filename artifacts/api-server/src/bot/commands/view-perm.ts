import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  type GuildTextBasedChannel,
  Message,
} from "discord.js";
import { getPermsForRole } from "../store.js";
import { canRunCommand } from "../permissions.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "view-perm";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("View all bot command permissions granted to a role")
  .addRoleOption((opt) =>
    opt.setName("role").setDescription("The role to inspect").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: `${E.cross} Server only.`, ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.Administrator) && !canRunCommand(executor, COMMAND_NAME)) {
    await interaction.reply({ content: `${E.cross} No permission.`, ephemeral: true });
    return;
  }

  const role = interaction.options.getRole("role", true);
  const container = buildViewPermContainer(interaction.guild.id, role.id, role.name);
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as never);
}

export async function runViewPerm(
  message: Message,
  executor: GuildMember,
  args: string[],
): Promise<void> {
  if (!message.guild) return;

  if (!executor.permissions.has(PermissionFlagsBits.Administrator) && !canRunCommand(executor, COMMAND_NAME)) {
    await message.reply(`${E.cross} You do not have permission to use this command.`);
    return;
  }

  const roleArg = args[0];
  if (!roleArg) {
    const { replyWithGuide } = await import("../guides.js");
    await replyWithGuide(message, COMMAND_NAME);
    return;
  }

  const roleIdMatch = roleArg.match(/^<@&(\d+)>$/) ?? roleArg.match(/^(\d+)$/);
  if (!roleIdMatch) {
    await message.reply(`${E.cross} Please mention a role or provide a role ID.`);
    return;
  }

  const roleId = roleIdMatch[1]!;
  const role = await message.guild.roles.fetch(roleId).catch(() => null);
  if (!role) {
    await message.reply(`${E.cross} Could not find that role.`);
    return;
  }

  const container = buildViewPermContainer(message.guild.id, role.id, role.name);
  await (message.channel as GuildTextBasedChannel).send({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as never);
}

function buildViewPermContainer(guildId: string, roleId: string, roleName: string): ContainerBuilder {
  const perms = getPermsForRole(guildId, roleId);
  const ts = Math.floor(Date.now() / 1000);

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${E.sliders}  Permissions — @${roleName}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  if (perms.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `<@&${roleId}> has **no** bot command permissions.\nUse \`/add-perm\` or \`;add-perm\` to grant some.`,
      ),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `<@&${roleId}> can use **${perms.length}** command${perms.length === 1 ? "" : "s"}:\n\n` +
        perms.map((cmd) => `${E.check}  \`/${cmd}\``).join("\n"),
      ),
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Role ID: ${roleId}  ·  <t:${ts}:f>`),
  );

  return container;
}
