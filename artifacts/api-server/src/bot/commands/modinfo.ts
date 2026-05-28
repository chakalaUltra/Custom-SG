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
import { getModActionsByModerator, type ModActionType } from "../store.js";
import { canRunCommand } from "../permissions.js";

export const COMMAND_NAME = "modinfo";

const ACTION_LABELS: Record<ModActionType, string> = {
  warn: "Warns",
  dewarn: "Dewarns",
  kick: "Kicks",
  ban: "Bans",
  unban: "Unbans",
  mute: "Mutes",
  unmute: "Unmutes",
  verify: "Verifications",
  mainer: "Mainers",
};

const ACTION_EMOJI: Record<ModActionType, string> = {
  warn: "⚠️",
  dewarn: "🗑️",
  kick: "👢",
  ban: "🔨",
  unban: "🔓",
  mute: "🔇",
  unmute: "🔊",
  verify: "✅",
  mainer: "⭐",
};

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("View moderation stats for a moderator")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The moderator to look up").setRequired(true),
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
  await interaction.deferReply();
  await runModinfo(interaction.guild.id, targetUser.id, targetUser.tag, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runModinfo(
  guildId: string,
  moderatorId: string,
  moderatorTag: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const actions = getModActionsByModerator(guildId, moderatorId);

  const counts: Partial<Record<ModActionType, number>> = {};
  for (const action of actions) {
    counts[action.type] = (counts[action.type] ?? 0) + 1;
  }

  const total = actions.length;

  const types: ModActionType[] = [
    "verify", "mainer", "warn", "dewarn", "mute", "unmute", "kick", "ban", "unban",
  ];

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 📊 Mod Stats — ${moderatorTag}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const lines = types
    .map((t) => `${ACTION_EMOJI[t]} **${ACTION_LABELS[t]}:** ${counts[t] ?? 0}`)
    .join("\n");

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${total} total action${total === 1 ? "" : "s"} on record`),
  );

  await replyFn({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { parse: [], repliedUser: false },
  });
}
