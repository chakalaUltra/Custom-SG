import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  EmbedBuilder,
  Client,
  User,
} from "discord.js";
import { getVerifyRoles, getUserRank, getVerifierForUser } from "../store.js";
import { canRunCommand } from "../permissions.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "userinfo";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("View info about a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to look up").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: `${E.cross} Server only.`, ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!canRunCommand(executor, COMMAND_NAME)) {
    await interaction.reply({ content: `${E.cross} No permission.`, ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: `${E.cross} User not found in this server.` });
    return;
  }

  const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);
  const embed = buildUserinfoEmbed(interaction.guild.id, target, fullUser, executor);
  await interaction.editReply({ embeds: [embed] });
}

export async function runUserinfo(
  guildId: string,
  target: GuildMember,
  executor: GuildMember,
  client: Client,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const fullUser = await client.users.fetch(target.id, { force: true }).catch(() => target.user);
  const embed = buildUserinfoEmbed(guildId, target, fullUser, executor);
  await replyFn({ embeds: [embed] });
}

function buildUserinfoEmbed(
  guildId: string,
  target: GuildMember,
  fullUser: User,
  executor: GuildMember,
): EmbedBuilder {
  const verifyConfig = getVerifyRoles(guildId);
  const rank = getUserRank(guildId, target.id);
  const verifyAction = getVerifierForUser(guildId, target.id);

  const isMainer = verifyConfig ? target.roles.cache.has(verifyConfig.mainerRoleId) : false;
  const isVerified = verifyConfig ? target.roles.cache.has(verifyConfig.verifiedRoleId) : false;

  const statusEmoji = isMainer ? E.star : isVerified ? E.shield : E.question;
  const statusLabel = isMainer ? "Mainer" : isVerified ? "Verified" : "Visitor";

  let color = isMainer ? 0xffd700 : isVerified ? 0x5dbb8a : 0x7289da;
  if (target.displayColor && target.displayColor !== 0) color = target.displayColor;

  const topRoles = [...target.roles.cache.values()]
    .filter((r) => r.id !== target.guild.id)
    .sort((a, b) => b.position - a.position)
    .slice(0, 6);

  const rankLine = rank
    ? `${E.chart}  Stage **${rank.stage}** · ${rank.midstage} · ${rank.extrastage}`
    : `${E.chart}  *Not ranked*`;

  const verifyLine = verifyAction
    ? `${E.shield}  Verified by **${verifyAction.moderatorTag}** · <t:${Math.floor(verifyAction.timestamp / 1000)}:R>`
    : `${E.shield}  *Not verified*`;

  const joinTs = target.joinedAt ? Math.floor(target.joinedAt.getTime() / 1000) : null;
  const createTs = Math.floor(fullUser.createdAt.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `${statusEmoji}  ${target.nickname ?? fullUser.username}`,
      iconURL: fullUser.displayAvatarURL({ size: 64 }),
    })
    .setDescription(
      [
        `<@${target.id}>  ·  \`${fullUser.tag}\``,
        ``,
        rankLine,
        verifyLine,
      ].join("\n"),
    )
    .setThumbnail(fullUser.displayAvatarURL({ size: 256 }))
    .addFields(
      {
        name: "Joined",
        value: joinTs ? `<t:${joinTs}:D>\n<t:${joinTs}:R>` : "Unknown",
        inline: true,
      },
      {
        name: "Created",
        value: `<t:${createTs}:D>\n<t:${createTs}:R>`,
        inline: true,
      },
      {
        name: "Status",
        value: `**${statusLabel}**`,
        inline: true,
      },
    )
    .setFooter({ text: `ID: ${target.id}` })
    .setTimestamp();

  if (topRoles.length > 0) {
    embed.addFields({
      name: `Roles (${target.roles.cache.size - 1})`,
      value: topRoles.map((r) => `<@&${r.id}>`).join("  "),
      inline: false,
    });
  }

  const bannerURL = fullUser.bannerURL({ size: 1024 });
  if (bannerURL) embed.setImage(bannerURL);

  return embed;
}
