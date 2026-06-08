import { EmbedBuilder, Message } from "discord.js";
import { E } from "./emojis.js";
import { C } from "./colors.js";

type Category = "verification" | "warning" | "moderation" | "role" | "info" | "config";

interface Arg {
  name: string;
  desc: string;
  required: boolean;
}

interface Guide {
  category: Category;
  emoji: string;
  description: string;
  usage: string;
  args: Arg[];
  example: string;
  note?: string;
}

const CATEGORY_COLORS: Record<Category, number> = {
  verification: C.catVerification,
  warning:      C.catWarning,
  moderation:   C.catModeration,
  role:         C.catRole,
  info:         C.catInfo,
  config:       C.catConfig,
};

const CATEGORY_LABELS: Record<Category, string> = {
  verification: "Verification",
  warning:      "Warnings",
  moderation:   "Moderation",
  role:         "Roles & Ranks",
  info:         "Information",
  config:       "Configuration",
};

const GUIDES: Record<string, Guide> = {
  verify: {
    category: "verification",
    emoji: E.shield,
    description: "Grants the **Verified** role to a user and logs who verified them.",
    usage: "$verify <@user>",
    args: [
      { name: "@user", desc: "The user to verify (mention or ID)", required: true },
    ],
    example: "$verify @JohnDoe",
  },
  mainer: {
    category: "verification",
    emoji: E.star,
    description: "Promotes a user to **Mainer** status. The user must already be verified.",
    usage: "$mainer <@user>",
    args: [
      { name: "@user", desc: "The user to promote (mention or ID)", required: true },
    ],
    example: "$mainer @JohnDoe",
  },
  "add-perm": {
    category: "config",
    emoji: E.plus,
    description: "Grants a role the ability to use a specific bot command. Admin-only.",
    usage: "$add-perm <@role> <command>",
    args: [
      { name: "@role",   desc: "Role to grant access to (mention or ID)", required: true },
      { name: "command", desc: "The command name to grant (e.g. `warn`, `kick`, `rank`)", required: true },
    ],
    example: "$add-perm @Moderator warn",
    note: "Some commands like `add-perm` and `modlogs` are admin-only and cannot be granted.",
  },
  "view-perm": {
    category: "config",
    emoji: E.sliders,
    description: "Lists every bot command permission currently granted to a role.",
    usage: "$view-perm <@role>",
    args: [
      { name: "@role", desc: "Role to inspect (mention or ID)", required: true },
    ],
    example: "$view-perm @Moderator",
  },
  warn: {
    category: "warning",
    emoji: E.bell,
    description: "Issues a formal warning to a user and adds it to their record.",
    usage: "$warn <@user> <reason>",
    args: [
      { name: "@user",  desc: "User to warn (mention or ID)", required: true },
      { name: "reason", desc: "Reason for the warning", required: true },
    ],
    example: "$warn @JohnDoe Spamming in #general",
  },
  warnings: {
    category: "warning",
    emoji: E.search,
    description: "Shows the full warning history for a user.",
    usage: "$warnings <@user>",
    args: [
      { name: "@user", desc: "User to look up (mention or ID)", required: true },
    ],
    example: "$warnings @JohnDoe",
  },
  dewarn: {
    category: "warning",
    emoji: E.trash,
    description: "Opens a menu to select and remove a specific warning from a user's record.",
    usage: "$dewarn <@user>",
    args: [
      { name: "@user", desc: "User whose warning to remove (mention or ID)", required: true },
    ],
    example: "$dewarn @JohnDoe",
  },
  mute: {
    category: "moderation",
    emoji: E.cross,
    description: "Times out a user for a set duration, preventing them from sending messages.",
    usage: "$mute <@user> <duration> <reason>",
    args: [
      { name: "@user",    desc: "User to mute (mention or ID)", required: true },
      { name: "duration", desc: "How long to mute — e.g. `10m`, `2h`, `1d`, `7d`", required: true },
      { name: "reason",   desc: "Reason for the mute", required: true },
    ],
    example: "$mute @JohnDoe 1h Disruptive behavior in voice",
    note: "Maximum timeout duration is **28 days** (Discord limit).",
  },
  unmute: {
    category: "moderation",
    emoji: E.check,
    description: "Removes an active timeout from a user.",
    usage: "$unmute <@user> <reason>",
    args: [
      { name: "@user",  desc: "User to unmute (mention or ID)", required: true },
      { name: "reason", desc: "Reason for removing the mute", required: true },
    ],
    example: "$unmute @JohnDoe Appeal accepted",
  },
  ban: {
    category: "moderation",
    emoji: E.cross,
    description: "Permanently bans a user from the server. Works even if the user has already left.",
    usage: "$ban <@user | userID> <reason>",
    args: [
      { name: "@user / ID", desc: "User to ban — mention, or paste their numeric ID", required: true },
      { name: "reason",     desc: "Reason for the ban", required: true },
    ],
    example: "$ban @JohnDoe Repeated severe rule violations",
    note: "Using a user ID lets you ban someone who is no longer in the server.",
  },
  unban: {
    category: "moderation",
    emoji: E.check,
    description: "Lifts a ban on a previously banned user.",
    usage: "$unban <userID> <reason>",
    args: [
      { name: "userID", desc: "The numeric Discord ID of the banned user", required: true },
      { name: "reason", desc: "Reason for the unban", required: true },
    ],
    example: "$unban 123456789012345678 Appeal accepted",
    note: "You must use the user's numeric ID — you cannot mention a banned user.",
  },
  kick: {
    category: "moderation",
    emoji: E.cross,
    description: "Kicks a user from the server. They can rejoin with an invite.",
    usage: "$kick <@user> <reason>",
    args: [
      { name: "@user",  desc: "User to kick (mention or ID)", required: true },
      { name: "reason", desc: "Reason for the kick", required: true },
    ],
    example: "$kick @JohnDoe Breaking server rules",
  },
  role: {
    category: "role",
    emoji: E.userConfig,
    description: "Toggles a role on a user — adds it if they don't have it, removes it if they do.",
    usage: "$role <@user> <role name or ID>",
    args: [
      { name: "@user",       desc: "Target user (mention or ID)", required: true },
      { name: "role name/ID", desc: "Role name (case-insensitive), mention, or role ID", required: true },
    ],
    example: "$role @JohnDoe Trial Staff",
    note: "Role name matching is case-insensitive. Partial names are not supported.",
  },
  rank: {
    category: "role",
    emoji: E.chart,
    description: "Assigns a full rank to a user by setting their stage, midstage, and extrastage roles.",
    usage: "$rank <@user> <stage> <midstage> <extrastage>",
    args: [
      { name: "@user",      desc: "User to rank (mention or ID)", required: true },
      { name: "stage",      desc: "A number from `1` to `5`", required: true },
      { name: "midstage",   desc: "`High`, `Mid`, or `Low` (case-sensitive)", required: true },
      { name: "extrastage", desc: "`Strong`, `Stable`, or `Weak` (case-sensitive)", required: true },
    ],
    example: "$rank @JohnDoe 3 High Stable",
    note: "Rank roles must be configured first with `/rank-roles`.",
  },
  leaderboard: {
    category: "info",
    emoji: E.chart,
    description: "Shows the top 12 staff members ranked by number of mod actions taken.",
    usage: "$leaderboard",
    args: [],
    example: "$leaderboard",
  },
  userinfo: {
    category: "info",
    emoji: E.info,
    description: "Displays a detailed info card for a user — rank, status, roles, join date, and more.",
    usage: "$userinfo <@user>",
    args: [
      { name: "@user", desc: "User to inspect (mention or ID)", required: true },
    ],
    example: "$userinfo @JohnDoe",
  },
  modinfo: {
    category: "info",
    emoji: E.search,
    description: "Shows a full summary of all mod actions recorded against a user.",
    usage: "$modinfo <@user>",
    args: [
      { name: "@user", desc: "User to look up (mention or ID)", required: true },
    ],
    example: "$modinfo @JohnDoe",
  },
  modlogs: {
    category: "config",
    emoji: E.message,
    description: "Configure the channel where mod log events are posted.",
    usage: "$modlogs",
    args: [],
    example: "$modlogs",
  },
};

export async function replyWithGuide(message: Message, commandName: string): Promise<void> {
  const guide = GUIDES[commandName];
  if (!guide) {
    await message.reply(`${E.cross} No guide available for \`${commandName}\`.`);
    return;
  }

  const color = CATEGORY_COLORS[guide.category];
  const categoryLabel = CATEGORY_LABELS[guide.category];

  const argsBlock = guide.args.length === 0
    ? null
    : guide.args
        .map((a) => {
          const badge = a.required ? "`required`" : "`optional`";
          return `${a.required ? E.editCheck : E.dots}  **${a.name}** ${badge}\n-# ${a.desc}`;
        })
        .join("\n");

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${guide.emoji}  $${commandName}`)
    .setDescription(guide.description)
    .addFields({
      name: `${E.info}  Usage`,
      value: `\`\`\`\n${guide.usage}\n\`\`\``,
      inline: false,
    });

  if (argsBlock) {
    embed.addFields({
      name: `${E.sliders}  Arguments`,
      value: argsBlock,
      inline: false,
    });
  }

  embed.addFields({
    name: `${E.check}  Example`,
    value: `\`\`\`\n${guide.example}\n\`\`\``,
    inline: false,
  });

  if (guide.note) {
    embed.addFields({
      name: `${E.bell}  Note`,
      value: guide.note,
      inline: false,
    });
  }

  embed.setFooter({
    text: `${categoryLabel}  ·  Angle brackets < > mark required arguments`,
  });

  await message.reply({ embeds: [embed] });
}
