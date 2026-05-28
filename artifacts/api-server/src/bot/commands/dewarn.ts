import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { getWarnings, removeWarning, saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";

export const COMMAND_NAME = "dewarn";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Remove a warning from a user via a dropdown")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to remove a warning from").setRequired(true),
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
  await sendDewarnMenu(
    interaction.guild.id,
    targetUser.id,
    targetUser.tag,
    async (p) => { await interaction.reply(p as never); },
  );
}

export async function sendDewarnMenu(
  guildId: string,
  targetId: string,
  targetTag: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const warnings = getWarnings(guildId, targetId);

  if (warnings.length === 0) {
    await replyFn({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 📋 No Warnings\n**${targetTag}** has no warnings to remove.`),
        ),
      ],
      allowedMentions: { parse: [], repliedUser: false },
    });
    return;
  }

  const options = warnings.slice(0, 25).map((w, i) => {
    const date = new Date(w.timestamp).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
    return new StringSelectMenuOptionBuilder()
      .setLabel(`[${i + 1}] ${w.reason.slice(0, 80)}`)
      .setDescription(`${date} — by ${w.moderatorTag}`)
      .setValue(`${guildId}:${targetId}:${w.id}`);
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`dewarn:${guildId}:${targetId}`)
    .setPlaceholder("Select a warning to remove…")
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  await replyFn({
    content: `Select a warning to remove from **${targetTag}**:`,
    components: [row],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

export async function handleDewarnSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const selected = interaction.values[0];
  if (!selected) return;

  const [guildId, targetId, warnId] = selected.split(":");
  if (!guildId || !targetId || !warnId || !interaction.guild) return;

  const warnings = getWarnings(guildId, targetId);
  const warning = warnings.find((w) => w.id === warnId);

  await removeWarning(guildId, targetId, warnId);

  let targetTag = "Unknown User";
  try {
    const user = await interaction.client.users.fetch(targetId);
    targetTag = user.tag;
  } catch { /* ignore */ }

  const executor = interaction.member as GuildMember;

  await saveModAction(guildId, {
    id: generateId(),
    type: "dewarn",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId,
    targetTag,
    reason: warning?.reason,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "dewarn", targetTag, targetId, executor.user.tag, {
    reason: warning ? `Removed: "${warning.reason}"` : undefined,
  });

  const payload = buildActionContainer(
    "🗑️ Warning Removed",
    [`Warning removed from **${targetTag}**.`],
    `By ${executor.user.tag}`,
  );

  await interaction.update({
    content: `✅ Warning removed from **${targetTag}**.`,
    components: [],
    embeds: [],
  });
}
