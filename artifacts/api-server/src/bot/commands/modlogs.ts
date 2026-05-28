import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  ChannelType,
  Message,
  type GuildTextBasedChannel,
} from "discord.js";
import { saveModLogsChannel } from "../store.js";
import { buildActionContainer } from "../components.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "modlogs";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Set the channel where moderation logs are sent (admin only)")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("The channel to send mod logs to")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true),
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
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: `${E.cross} Only administrators can use this command.`, ephemeral: true });
    return;
  }

  const channel = interaction.options.getChannel("channel", true);
  await saveModLogsChannel(interaction.guild.id, channel.id);

  await interaction.reply(
    buildActionContainer(
      `${E.message} Mod Logs Configured`,
      [`Moderation logs will now be sent to <#${channel.id}>.`],
      `Set by ${executor.user.tag}`,
    ),
  );
}

export async function runModlogs(
  message: Message,
  executor: GuildMember,
  args: string[],
): Promise<void> {
  if (!message.guild) return;

  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await message.reply(`${E.cross} Only administrators can use this command.`);
    return;
  }

  const channelArg = args[0];
  if (!channelArg) {
    await message.reply(`${E.cross} Usage: \`$modlogs #channel\` or \`$modlogs CHANNEL_ID\``);
    return;
  }

  const channelIdMatch = channelArg.match(/^<#(\d+)>$/) ?? channelArg.match(/^(\d+)$/);
  if (!channelIdMatch) {
    await message.reply(`${E.cross} Please mention a channel or provide a channel ID.`);
    return;
  }

  const channelId = channelIdMatch[1];
  const ch = await message.guild.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) {
    await message.reply(`${E.cross} Could not find a text channel with that ID.`);
    return;
  }

  await saveModLogsChannel(message.guild.id, channelId);

  await (message.channel as GuildTextBasedChannel).send(
    buildActionContainer(
      `${E.message} Mod Logs Configured`,
      [`Moderation logs will now be sent to <#${channelId}>.`],
      `Set by ${executor.user.tag}`,
    ),
  );
}
