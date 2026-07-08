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
import { getAllModActions } from "../store.js";
import { canRunCommand } from "../permissions.js";
import { E } from "../emojis.js";
import { C } from "../colors.js";

export const COMMAND_NAME = "leaderboard";

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("View the top staff members by mod actions (up to top 12)")
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
  await runLeaderboard(interaction.guild.id, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runLeaderboard(
  guildId: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const actions = getAllModActions(guildId);

  const counts = new Map<string, { tag: string; count: number }>();
  for (const action of actions) {
    const existing = counts.get(action.moderatorId);
    if (existing) {
      existing.count++;
    } else {
      counts.set(action.moderatorId, { tag: action.moderatorTag, count: 1 });
    }
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12);

  if (sorted.length === 0) {
    const container = new ContainerBuilder().setAccentColor(C.yellow);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${E.chart}  Staff Leaderboard\n-# No mod actions recorded yet`,
      ),
    );
    await replyFn({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { parse: [], repliedUser: false },
    });
    return;
  }

  const topCount = sorted[0]![1].count;
  const container = new ContainerBuilder().setAccentColor(C.yellow);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.chart}  Staff Leaderboard\n-# ${sorted.length} staff · ${actions.length} total actions`,
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const lines = sorted.map(([, data], i) => {
    const badge = RANK_BADGES[i] ?? `**#${i + 1}**`;
    const bar = buildBar(data.count, topCount);
    return `${badge}  **${data.tag}** — ${data.count} action${data.count === 1 ? "" : "s"}\n-# ${bar}`;
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.join("\n\n")),
  );

  await replyFn({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

function buildBar(count: number, max: number): string {
  const filled = Math.round((count / max) * 12);
  const empty = 12 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}
