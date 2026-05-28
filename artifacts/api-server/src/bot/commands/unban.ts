import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  Message,
} from "discord.js";
import { saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";

export const COMMAND_NAME = "unban";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Unban a user by their ID")
  .addStringOption((opt) =>
    opt
      .setName("userid")
      .setDescription("The user ID to unban")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for the unban").setRequired(true),
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

  const userIdRaw = interaction.options.getString("userid", true).replace(/[<@!>]/g, "");
  const reason = interaction.options.getString("reason", true);

  await interaction.deferReply();
  await runUnban(interaction.guild.id, userIdRaw, executor, reason, async (p) => {
    await interaction.editReply(p as never);
  }, interaction.client);
}

export async function runUnban(
  guildId: string,
  userId: string,
  executor: GuildMember,
  reason: string,
  replyFn: (payload: object) => Promise<void>,
  client: { users: { fetch: (id: string) => Promise<{ tag: string }> } },
): Promise<void> {
  if (!/^\d+$/.test(userId)) {
    await replyFn({ content: "❌ Please provide a valid numeric user ID." });
    return;
  }

  let targetTag = userId;
  try {
    const user = await client.users.fetch(userId);
    targetTag = user.tag;
  } catch { /* unknown user, use ID */ }

  try {
    await executor.guild.bans.remove(userId, reason);
  } catch {
    await replyFn({ content: "❌ Could not unban — the user may not be banned, or the bot lacks **Ban Members** permission." });
    return;
  }

  await saveModAction(guildId, {
    id: generateId(),
    type: "unban",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: userId,
    targetTag,
    reason,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "unban", targetTag, userId, executor.user.tag, { reason });

  await replyFn(
    buildActionContainer(
      "🔓 User Unbanned",
      [`**${targetTag}** has been unbanned.`],
      `By ${executor.user.tag}`,
    ),
  );
}
