import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { addWarning, saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";

export const COMMAND_NAME = "warn";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Issue a warning to a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to warn").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for the warning").setRequired(true),
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
  await runWarn(interaction.guild.id, targetUser.id, targetUser.tag, executor, reason, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runWarn(
  guildId: string,
  targetId: string,
  targetTag: string,
  executor: GuildMember,
  reason: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const id = generateId();
  const warning = {
    id,
    reason,
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    timestamp: Date.now(),
  };

  await addWarning(guildId, targetId, warning);
  await saveModAction(guildId, {
    id: generateId(),
    type: "warn",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId,
    targetTag,
    reason,
    timestamp: Date.now(),
  });
  await dispatchModLog(guildId, "warn", targetTag, targetId, executor.user.tag, { reason });

  await replyFn(
    buildActionContainer(
      "⚠️ Warning Issued",
      [`**${targetTag}** has been warned.`, `Reason: ${reason}`],
      `By ${executor.user.tag}`,
    ),
  );
}
