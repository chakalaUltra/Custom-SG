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

export const COMMAND_NAME = "mute";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Timeout a user for a set duration")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to mute").setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("duration")
      .setDescription("Duration: e.g. 10m, 2h, 1d (max 28d)")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for the mute").setRequired(true),
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
  const durationStr = interaction.options.getString("duration", true);
  const reason = interaction.options.getString("reason", true);

  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: "❌ Could not find that user in this server." });
    return;
  }

  await runMute(interaction.guild.id, target, executor, durationStr, reason, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runMute(
  guildId: string,
  target: GuildMember,
  executor: GuildMember,
  durationStr: string,
  reason: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const durationMs = parseDuration(durationStr);
  if (durationMs === null) {
    await replyFn({ content: "❌ Invalid duration. Use formats like `30s`, `10m`, `2h`, `1d` (max 28d)." });
    return;
  }

  const maxMs = 28 * 24 * 60 * 60 * 1000;
  if (durationMs > maxMs) {
    await replyFn({ content: "❌ Maximum timeout duration is **28 days**." });
    return;
  }

  try {
    await target.timeout(durationMs, reason);
  } catch {
    await replyFn({ content: "❌ Failed to mute the user. Ensure the bot has the **Moderate Members** permission." });
    return;
  }

  await saveModAction(guildId, {
    id: generateId(),
    type: "mute",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: target.id,
    targetTag: target.user.tag,
    reason,
    duration: durationMs,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "mute", target.user.tag, target.id, executor.user.tag, {
    reason,
    extra: `Duration: ${durationStr}`,
  });

  await replyFn(
    buildActionContainer(
      "🔇 User Muted",
      [`**${target.user.tag}** has been muted for **${durationStr}**.`, `Reason: ${reason}`],
      `By ${executor.user.tag}`,
    ),
  );
}

export function parseDuration(str: string): number | null {
  const match = str.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  if (amount <= 0) return null;
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * multipliers[unit]!;
}
