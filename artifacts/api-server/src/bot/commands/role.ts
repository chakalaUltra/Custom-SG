import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  Message,
  type GuildTextBasedChannel,
} from "discord.js";
import { saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "role";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Give or take a role from a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to assign the role to").setRequired(true),
  )
  .addRoleOption((opt) =>
    opt.setName("role").setDescription("The role to assign").setRequired(true),
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
  const role = interaction.options.getRole("role", true);

  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: `${E.cross} Could not find that user in this server.` });
    return;
  }

  await runRole(interaction.guild.id, target, executor, role.id, role.name, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runRole(
  guildId: string,
  target: GuildMember,
  executor: GuildMember,
  roleId: string,
  roleName: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const hasRole = target.roles.cache.has(roleId);

  try {
    if (hasRole) {
      await target.roles.remove(roleId);
    } else {
      await target.roles.add(roleId);
    }
  } catch {
    await replyFn({ content: `${E.cross} Failed to modify roles. Ensure the bot has **Manage Roles** and its role is above the target role.` });
    return;
  }

  await saveModAction(guildId, {
    id: generateId(),
    type: "role",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: target.id,
    targetTag: target.user.tag,
    reason: `${hasRole ? "Removed" : "Assigned"} role: ${roleName}`,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "role", target.user.tag, target.id, executor.user.tag, {
    extra: `${hasRole ? "Removed" : "Assigned"} **${roleName}**`,
  });

  await replyFn(
    buildActionContainer(
      `${E.editCheck} Role ${hasRole ? "Removed" : "Assigned"}`,
      [
        `**${roleName}** has been ${hasRole ? "removed from" : "given to"} **${target.user.tag}**.`,
      ],
      `By ${executor.user.tag}`,
    ),
  );
}

export async function runRoleByResolvable(
  message: Message,
  target: GuildMember,
  executor: GuildMember,
  roleResolvable: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  if (!message.guild) return;

  const role = await resolveRole(message.guild, roleResolvable);
  if (!role) {
    await replyFn({ content: `${E.cross} Could not find a role matching \`${roleResolvable}\`. Try using the role ID or exact name.` });
    return;
  }

  await runRole(message.guild.id, target, executor, role.id, role.name, replyFn);
}

async function resolveRole(
  guild: { roles: { cache: Map<string, { id: string; name: string }> } },
  resolvable: string,
): Promise<{ id: string; name: string } | null> {
  const mentionMatch = resolvable.match(/^<@&(\d+)>$/);
  if (mentionMatch) {
    return guild.roles.cache.get(mentionMatch[1]) ?? null;
  }
  if (/^\d+$/.test(resolvable)) {
    return guild.roles.cache.get(resolvable) ?? null;
  }
  const lower = resolvable.toLowerCase();
  for (const role of guild.roles.cache.values()) {
    if (role.name.toLowerCase() === lower) return role;
  }
  return null;
}
