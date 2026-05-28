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
import { getAllModActions } from "../store.js";
import { canRunCommand } from "../permissions.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

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

  const actions = getAllModActions(interaction.guild.id);

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
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${E.chart} Staff Leaderboard\nNo mod actions have been recorded yet.`),
        ),
      ],
      allowedMentions: { parse: [], repliedUser: false },
    } as never);
    return;
  }

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${E.chart} Staff Leaderboard`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const lines = sorted.map(([, data], i) => {
    const medal = MEDALS[i] ?? `**${i + 1}.**`;
    const bar = buildBar(data.count, sorted[0]![1].count);
    return `${medal} **${data.tag}** — ${data.count} action${data.count === 1 ? "" : "s"}\n-# ${bar}`;
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.join("\n\n")),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${sorted.length} staff member${sorted.length === 1 ? "" : "s"} · ${actions.length} total actions`),
  );

  await interaction.editReply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  } as never);
}

function buildBar(count: number, max: number): string {
  const filled = Math.round((count / max) * 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}
