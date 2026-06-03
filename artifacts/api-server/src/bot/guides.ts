import { EmbedBuilder, Message } from "discord.js";
import { E } from "./emojis.js";

interface Guide {
  description: string;
  syntax: string;
  args?: string;
  example: string;
}

const GUIDES: Record<string, Guide> = {
  verify: {
    description: "Grants the **Verified** role to a user, logging them as verified.",
    syntax: "`$verify @user`",
    example: "`$verify @JohnDoe`",
  },
  mainer: {
    description: "Promotes a user to **Mainer** status (requires them to already be verified).",
    syntax: "`$mainer @user`",
    example: "`$mainer @JohnDoe`",
  },
  "add-perm": {
    description: "Grants a role permission to use a specific bot command.",
    syntax: "`$add-perm @role <command>`",
    args: "`role` — mention or role ID\n`command` — one of the grantable command names",
    example: "`$add-perm @Moderator warn`",
  },
  "view-perm": {
    description: "Lists all bot command permissions granted to a specific role.",
    syntax: "`$view-perm @role`",
    args: "`role` — mention or role ID",
    example: "`$view-perm @Moderator`",
  },
  warn: {
    description: "Issues a warning to a user and logs it to their record.",
    syntax: "`$warn @user <reason>`",
    args: "`user` — mention or user ID\n`reason` — reason for the warning (required)",
    example: "`$warn @JohnDoe Spamming in general`",
  },
  warnings: {
    description: "Displays all warnings on record for a user.",
    syntax: "`$warnings @user`",
    example: "`$warnings @JohnDoe`",
  },
  dewarn: {
    description: "Opens a menu to remove a specific warning from a user's record.",
    syntax: "`$dewarn @user`",
    example: "`$dewarn @JohnDoe`",
  },
  mute: {
    description: "Times out a user for a given duration.",
    syntax: "`$mute @user <duration> <reason>`",
    args: "`user` — mention or user ID\n`duration` — e.g. `10m`, `2h`, `1d`, `7d`\n`reason` — reason for the mute (required)",
    example: "`$mute @JohnDoe 1h Disruptive behavior`",
  },
  unmute: {
    description: "Removes a timeout from a user.",
    syntax: "`$unmute @user <reason>`",
    args: "`user` — mention or user ID\n`reason` — reason for removing the mute (required)",
    example: "`$unmute @JohnDoe Appeal accepted`",
  },
  ban: {
    description: "Bans a user from the server. Works with mentions or user IDs (for already-left members).",
    syntax: "`$ban @user <reason>`  or  `$ban <userID> <reason>`",
    args: "`user` — mention or user ID\n`reason` — reason for the ban (required)",
    example: "`$ban @JohnDoe Repeated rule violations`",
  },
  unban: {
    description: "Unbans a previously banned user by their ID.",
    syntax: "`$unban <userID> <reason>`",
    args: "`userID` — the numeric Discord user ID\n`reason` — reason for the unban (required)",
    example: "`$unban 123456789012345678 Appeal accepted`",
  },
  kick: {
    description: "Kicks a user from the server.",
    syntax: "`$kick @user <reason>`",
    args: "`user` — mention or user ID\n`reason` — reason for the kick (required)",
    example: "`$kick @JohnDoe Breaking server rules`",
  },
  role: {
    description: "Gives or removes a role from a user. If they have it, it's removed; if not, it's added.",
    syntax: "`$role @user <role name or ID>`",
    args: "`user` — mention or user ID\n`role` — role name (case-insensitive), mention, or role ID",
    example: "`$role @JohnDoe Trial Staff`",
  },
  leaderboard: {
    description: "Shows the top staff members ranked by total mod actions taken.",
    syntax: "`$leaderboard`",
    example: "`$leaderboard`",
  },
  rank: {
    description: "Assigns a rank to a user by setting their stage, midstage, and extrastage roles.",
    syntax: "`$rank @user <stage> <midstage> <extrastage>`",
    args: "`user` — mention or user ID\n`stage` — a number from `1` to `5`\n`midstage` — `High`, `Mid`, or `Low`\n`extrastage` — `Strong`, `Stable`, or `Weak`",
    example: "`$rank @JohnDoe 3 High Stable`",
  },
  userinfo: {
    description: "Displays a detailed info card for a user including rank, status, roles, and dates.",
    syntax: "`$userinfo @user`",
    example: "`$userinfo @JohnDoe`",
  },
  modinfo: {
    description: "Shows a summary of all mod actions taken against a user (warns, mutes, kicks, bans).",
    syntax: "`$modinfo @user`",
    example: "`$modinfo @JohnDoe`",
  },
  modlogs: {
    description: "Configure or view the mod logs channel for this server.",
    syntax: "`$modlogs`",
    example: "`$modlogs`",
  },
};

export async function replyWithGuide(message: Message, commandName: string): Promise<void> {
  const guide = GUIDES[commandName];
  if (!guide) {
    await message.reply(`${E.cross} No guide available for \`${commandName}\`.`);
    return;
  }

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Syntax", value: guide.syntax },
  ];

  if (guide.args) {
    fields.push({ name: "Arguments", value: guide.args });
  }

  fields.push({ name: "Example", value: guide.example });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: `Command Guide  ·  $${commandName}` })
    .setDescription(guide.description)
    .addFields(fields)
    .setFooter({ text: "Arguments in <angle brackets> are required · [brackets] are optional" });

  await message.reply({ embeds: [embed] });
}
