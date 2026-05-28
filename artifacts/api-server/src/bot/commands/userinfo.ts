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

  let statusEmoji: string;
  let statusLabel: string;
  let embedColor: number;

  if (isMainer) {
    statusEmoji = E.star;
    statusLabel = "Mainer";
    embedColor = 0xffd700;
  } else if (isVerified) {
    statusEmoji = E.shield;
    statusLabel = "Verified";
    embedColor = 0x44cc88;
  } else {
    statusEmoji = E.question;
    statusLabel = "Visitor";
    embedColor = 0x7289da;
  }

  if (target.displayColor && target.displayColor !== 0) {
    embedColor = target.displayColor;
  }

  const visibleRoles = [...target.roles.cache.values()]
    .filter((r) => r.id !== interaction.guild!.id)
    .sort((a, b) => b.position - a.position)
    .slice(0, 10);

  const rolesDisplay = visibleRoles.length > 0
    ? visibleRoles.map((r) => `<@&${r.id}>`).join("  ")
    : "*No roles*";

  const joinedAt = target.joinedAt
    ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:D>\n<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>`
    : "Unknown";

  const createdAt = `<t:${Math.floor(fullUser.createdAt.getTime() / 1000)}:D>\n<t:${Math.floor(fullUser.createdAt.getTime() / 1000)}:R>`;

  const rankStr = rank
    ? `Stage **${rank.stage}** · **${rank.midstage}** · **${rank.extrastage}**`
    : "*Not ranked*";

  const verifiedByStr = verifyAction
    ? `**${verifyAction.moderatorTag}**\n<t:${Math.floor(verifyAction.timestamp / 1000)}:R>`
    : "*Not verified*";

  const displayName = target.nickname ?? fullUser.username;
  const tag = fullUser.tag;

  const descLines = [
    `### ${statusEmoji} ${displayName}`,
    `\`${tag}\` · <@${target.id}>`,
    ``,
    `${E.chart} **Rank** — ${rankStr}`,
  ];

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setDescription(descLines.join("\n"))
    .setThumbnail(fullUser.displayAvatarURL({ size: 256 }))
    .addFields(
      {
        name: `${E.shield}  Status`,
        value: `**${statusLabel}**`,
        inline: true,
      },
      {
        name: `${E.shield}  Verified By`,
        value: verifiedByStr,
        inline: true,
      },
      {
        name: "\u200b",
        value: "\u200b",
        inline: true,
      },
      {
        name: `${E.save}  Joined Server`,
        value: joinedAt,
        inline: true,
      },
      {
        name: `${E.link}  Account Created`,
        value: createdAt,
        inline: true,
      },
      {
        name: "\u200b",
        value: "\u200b",
        inline: true,
      },
      {
        name: `${E.sliders}  Roles  (${visibleRoles.length})`,
        value: rolesDisplay,
        inline: false,
      },
    )
    .setFooter({
      text: `ID: ${target.id}  •  Requested by ${executor.user.tag}`,
      iconURL: executor.user.displayAvatarURL({ size: 32 }),
    })
    .setTimestamp();

  const bannerURL = fullUser.bannerURL({ size: 1024 });
  if (bannerURL) {
    embed.setImage(bannerURL);
  } else {
    embed.setImage(fullUser.displayAvatarURL({ size: 1024, forceStatic: false }));
  }

  await interaction.editReply({ embeds: [embed] });
}
