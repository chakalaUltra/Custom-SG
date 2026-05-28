import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { getVerifyRoles, getUserRank, getVerifierForUser } from "../store.js";
import { canRunCommand } from "../permissions.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "userinfo";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("View detailed info about a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to look up").setRequired(true),
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
  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: `${E.cross} Could not find that user in this server.` });
    return;
  }

  const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

  const verifyConfig = getVerifyRoles(interaction.guild.id);
  const rank = getUserRank(interaction.guild.id, target.id);
  const verifyAction = getVerifierForUser(interaction.guild.id, target.id);

  const isMainer = verifyConfig ? target.roles.cache.has(verifyConfig.mainerRoleId) : false;
  const isVerified = verifyConfig ? target.roles.cache.has(verifyConfig.verifiedRoleId) : false;

  let status: string;
  if (isMainer) {
    status = `${E.star} Mainer`;
  } else if (isVerified) {
    status = `${E.shield} Verified`;
  } else {
    status = `${E.question} Visitor`;
  }

  const visibleRoles = [...target.roles.cache.values()]
    .filter((r) => r.id !== interaction.guild!.id)
    .sort((a, b) => b.position - a.position)
    .slice(0, 15)
    .map((r) => `<@&${r.id}>`)
    .join(" ");

  const joinedAt = target.joinedAt
    ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:D>`
    : "Unknown";
  const createdAt = `<t:${Math.floor(fullUser.createdAt.getTime() / 1000)}:D>`;

  const rankStr = rank
    ? `Stage **${rank.stage}** · **${rank.midstage}** · **${rank.extrastage}**`
    : "Not ranked";

  const verifiedBy = verifyAction
    ? `${verifyAction.moderatorTag} (<t:${Math.floor(verifyAction.timestamp / 1000)}:R>)`
    : "Not verified";

  const embed = new EmbedBuilder()
    .setColor(target.displayColor || 0x7289da)
    .setAuthor({
      name: fullUser.tag,
      iconURL: fullUser.displayAvatarURL({ size: 128 }),
    })
    .setThumbnail(fullUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: `${E.userConfig} Status`, value: status, inline: true },
      { name: `${E.chart} Rank`, value: rankStr, inline: true },
      { name: `${E.shield} Verified By`, value: verifiedBy, inline: false },
      { name: `${E.save} Joined Server`, value: joinedAt, inline: true },
      { name: `${E.link} Account Created`, value: createdAt, inline: true },
      { name: `${E.sliders} Roles`, value: visibleRoles || "None", inline: false },
    )
    .setFooter({ text: `ID: ${target.id}` })
    .setTimestamp();

  const bannerURL = fullUser.bannerURL({ size: 1024 });
  if (bannerURL) {
    embed.setImage(bannerURL);
  }

  await interaction.editReply({ embeds: [embed] });
}
