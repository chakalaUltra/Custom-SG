import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  type GuildTextBasedChannel,
  Message,
} from "discord.js";
import { C } from "../colors.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "help";

interface CommandEntry {
  slash: string;
  prefix?: string;
  desc: string;
}

interface Section {
  emoji: string;
  label: string;
  color: number;
  commands: CommandEntry[];
}

const SECTIONS: Section[] = [
  {
    emoji: E.shield,
    label: "Verification",
    color: C.catVerification,
    commands: [
      { slash: "/verify-roles",  desc: "Configure which roles count as verified / mainer" },
      { slash: "/verify",  prefix: "$verify @user",  desc: "Grant a user the Verified role" },
      { slash: "/mainer",  prefix: "$mainer @user",  desc: "Promote a verified user to Mainer" },
    ],
  },
  {
    emoji: E.bell,
    label: "Warnings",
    color: C.catWarning,
    commands: [
      { slash: "/warn",     prefix: "$warn @user <reason>",  desc: "Issue a warning to a user" },
      { slash: "/warnings", prefix: "$warnings @user",       desc: "View all warnings for a user" },
      { slash: "/dewarn",   prefix: "$dewarn @user",         desc: "Remove a warning from a user" },
    ],
  },
  {
    emoji: E.cross,
    label: "Moderation",
    color: C.catModeration,
    commands: [
      { slash: "/mute",   prefix: "$mute @user <dur> <reason>",  desc: "Timeout a user for a duration" },
      { slash: "/unmute", prefix: "$unmute @user <reason>",       desc: "Remove a timeout from a user" },
      { slash: "/kick",   prefix: "$kick @user <reason>",         desc: "Kick a user from the server" },
      { slash: "/ban",    prefix: "$ban @user <reason>",          desc: "Ban a user from the server" },
      { slash: "/unban",  prefix: "$unban <userID> <reason>",     desc: "Unban a user by their ID" },
    ],
  },
  {
    emoji: E.chart,
    label: "Roles & Ranks",
    color: C.catRole,
    commands: [
      { slash: "/role",       prefix: "$role @user <role>",                              desc: "Toggle a role on a user" },
      { slash: "/rank",       prefix: "$rank @user <stage> <mid> <extra>",              desc: "Assign a full rank to a user" },
      { slash: "/rank-roles",                                                             desc: "Configure which roles map to each rank tier" },
    ],
  },
  {
    emoji: E.info,
    label: "Information",
    color: C.catInfo,
    commands: [
      { slash: "/userinfo",    prefix: "$userinfo @user",   desc: "View a user's info card" },
      { slash: "/modinfo",     prefix: "$modinfo @user",    desc: "View all mod actions against a user" },
      { slash: "/leaderboard", prefix: "$leaderboard",      desc: "Top 12 staff by mod action count" },
    ],
  },
  {
    emoji: E.sliders,
    label: "Configuration",
    color: C.catConfig,
    commands: [
      { slash: "/add-perm",  prefix: "$add-perm @role <cmd>",  desc: "Grant a role access to a command" },
      { slash: "/view-perm", prefix: "$view-perm @role",        desc: "View permissions granted to a role" },
      { slash: "/modlogs",   prefix: "$modlogs",                desc: "Configure the mod logs channel" },
    ],
  },
];

function buildHelpEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(C.main)
    .setTitle(`${E.info}  SG Overseer — Command List`)
    .setDescription(
      `Use \`/command\` for slash commands or \`$command\` for prefix commands.\n` +
      `Type \`$<command>\` with no arguments to see a detailed guide for that command.\n` +
      `\u200b`,
    )
    .setTimestamp()
    .setFooter({ text: "Angle brackets < > = required  ·  Slash-only commands have no prefix version" });

  for (const section of SECTIONS) {
    const lines = section.commands.map((cmd) => {
      const slashPart = `\`${cmd.slash}\``;
      const prefixPart = cmd.prefix ? `  ·  \`${cmd.prefix}\`` : "";
      return `${E.editCheck}  ${slashPart}${prefixPart}\n-# ${cmd.desc}`;
    });

    embed.addFields({
      name: `${section.emoji}  ${section.label}`,
      value: lines.join("\n"),
      inline: false,
    });
  }

  return embed;
}

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Show all available commands");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({ embeds: [buildHelpEmbed()], ephemeral: false });
}

export async function runHelp(
  message: Message,
): Promise<void> {
  await (message.channel as GuildTextBasedChannel).send({ embeds: [buildHelpEmbed()] });
}
