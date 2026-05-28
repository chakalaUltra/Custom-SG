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
import { E } from "../emojis.js";

export const COMMAND_NAME = "kick";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Kick a user from the server")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to kick").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for the kick").setRequired(true),
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
  const reason = interaction.options.getString("reason", true);

  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: `${E.cross} Could not find that user in this server.` });
    return;
  }

  await runKick(interaction.guild.id, target, executor, reason, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runKick(
  guildId: string,
  target: GuildMember,
  executor: GuildMember,
  reason: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  try {
    await target.kick(reason);
  } catch {
    await replyFn({ content: `${E.cross} Failed to kick. Ensure the bot has the **Kick Members** permission.` });
    return;
  }

  await saveModAction(guildId, {
    id: generateId(),
    type: "kick",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: target.id,
    targetTag: target.user.tag,
    reason,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "kick", target.user.tag, target.id, executor.user.tag, { reason });

  await replyFn(
    buildActionContainer(
      `${E.left} User Kicked`,
      [`**${target.user.tag}** has been kicked.`, `Reason: ${reason}`],
      `By ${executor.user.tag}`,
    ),
  );
}
