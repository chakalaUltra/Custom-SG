import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";

export const COMMAND_NAME = "ban";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Ban a user from the server")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to ban").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for the ban").setRequired(true),
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
  const reason = interaction.options.getString("reason", true);

  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  await runBan(interaction.guild.id, targetUser.id, targetUser.tag, target, executor, reason, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runBan(
  guildId: string,
  targetId: string,
  targetTag: string,
  target: GuildMember | null,
  executor: GuildMember,
  reason: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  try {
    await executor.guild.members.ban(targetId, { reason, deleteMessageSeconds: 0 });
  } catch {
    await replyFn({ content: "❌ Failed to ban. Ensure the bot has the **Ban Members** permission." });
    return;
  }

  await saveModAction(guildId, {
    id: generateId(),
    type: "ban",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId,
    targetTag,
    reason,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "ban", targetTag, targetId, executor.user.tag, { reason });

  await replyFn(
    buildActionContainer(
      "🔨 User Banned",
      [`**${targetTag}** has been banned.`, `Reason: ${reason}`],
      `By ${executor.user.tag}`,
    ),
  );
}
