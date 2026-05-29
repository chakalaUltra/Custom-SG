import { Message, GuildMember, type GuildTextBasedChannel } from "discord.js";
import { canRunCommand } from "./permissions.js";
import { runVerify } from "./commands/verify.js";
import { runMainer } from "./commands/mainer.js";
import { runAddPerm } from "./commands/add-perm.js";
import { runWarn } from "./commands/warn.js";
import { runWarnings } from "./commands/warnings.js";
import { sendDewarnMenu } from "./commands/dewarn.js";
import { runMute } from "./commands/mute.js";
import { runUnmute } from "./commands/unmute.js";
import { runBan } from "./commands/ban.js";
import { runUnban } from "./commands/unban.js";
import { runKick } from "./commands/kick.js";
import { runModinfo } from "./commands/modinfo.js";
import { runModlogs } from "./commands/modlogs.js";
import { runRoleByResolvable } from "./commands/role.js";
import { runLeaderboard } from "./commands/leaderboard.js";
import { runRank, parseRankArgs } from "./commands/rank.js";
import { runUserinfo } from "./commands/userinfo.js";
import { logger } from "../lib/logger.js";
import { E } from "./emojis.js";

const PREFIX = "$";

export async function handlePrefixMessage(message: Message): Promise<void> {
  if (!message.content.startsWith(PREFIX)) return;
  if (message.author.bot) return;
  if (!message.guild) return;

  const withoutPrefix = message.content.slice(PREFIX.length).trim();
  const spaceIdx = withoutPrefix.search(/\s/);
  const commandName =
    spaceIdx === -1
      ? withoutPrefix.toLowerCase()
      : withoutPrefix.slice(0, spaceIdx).toLowerCase();
  const argString =
    spaceIdx === -1 ? "" : withoutPrefix.slice(spaceIdx + 1).trim();
  const args = argString.length > 0 ? argString.split(/\s+/) : [];

  const member = message.member;
  if (!member) return;

  logger.info({ commandName, userId: message.author.id }, "Prefix command received");

  const send = async (payload: object) => {
    await (message.channel as GuildTextBasedChannel).send(
      payload as Parameters<GuildTextBasedChannel["send"]>[0],
    );
  };

  switch (commandName) {
    // ─── Verification ────────────────────────────────────────────────────────
    case "verify": {
      if (!canRunCommand(member, "verify")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$verify @user\``); return; }
      await runVerify(target, member, send);
      break;
    }

    case "mainer": {
      if (!canRunCommand(member, "mainer")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$mainer @user\``); return; }
      await runMainer(target, member, send);
      break;
    }

    case "add-perm": {
      await runAddPerm(message, member, args);
      break;
    }

    // ─── Warnings ────────────────────────────────────────────────────────────
    case "warn": {
      if (!canRunCommand(member, "warn")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$warn @user <reason>\``); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await message.reply(`${E.cross} Please provide a reason.`); return; }
      await runWarn(message.guild.id, target.id, target.user.tag, member, reason, send);
      break;
    }

    case "warnings": {
      if (!canRunCommand(member, "warnings")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$warnings @user\``); return; }
      await runWarnings(message.guild.id, target.id, target.user.tag, send);
      break;
    }

    case "dewarn": {
      if (!canRunCommand(member, "dewarn")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$dewarn @user\``); return; }
      await sendDewarnMenu(message.guild.id, target.id, target.user.tag, send);
      break;
    }

    // ─── Mod Actions ─────────────────────────────────────────────────────────
    case "mute": {
      if (!canRunCommand(member, "mute")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$mute @user <duration> <reason>\``); return; }
      const duration = args[1];
      if (!duration) { await message.reply(`${E.cross} Please provide a duration (e.g. \`10m\`, \`2h\`, \`1d\`).`); return; }
      const reason = args.slice(2).join(" ");
      if (!reason) { await message.reply(`${E.cross} Please provide a reason.`); return; }
      await runMute(message.guild.id, target, member, duration, reason, send);
      break;
    }

    case "unmute": {
      if (!canRunCommand(member, "unmute")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$unmute @user <reason>\``); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await message.reply(`${E.cross} Please provide a reason.`); return; }
      await runUnmute(message.guild.id, target, member, reason, send);
      break;
    }

    case "ban": {
      if (!canRunCommand(member, "ban")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const userArg = args[0];
      if (!userArg) { await message.reply(`${E.cross} Usage: \`$ban @user <reason>\``); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await message.reply(`${E.cross} Please provide a reason.`); return; }
      const userId = extractUserId(userArg);
      if (!userId) { await message.reply(`${E.cross} Please mention a user or provide a user ID.`); return; }
      const target = await message.guild.members.fetch(userId).catch(() => null);
      await runBan(message.guild.id, userId, target?.user.tag ?? userId, target, member, reason, send);
      break;
    }

    case "unban": {
      if (!canRunCommand(member, "unban")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const userArg = args[0];
      if (!userArg) { await message.reply(`${E.cross} Usage: \`$unban <userID> <reason>\``); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await message.reply(`${E.cross} Please provide a reason.`); return; }
      const userId = extractUserId(userArg);
      if (!userId) { await message.reply(`${E.cross} Please provide a valid user ID.`); return; }
      await runUnban(message.guild.id, userId, member, reason, send, message.client);
      break;
    }

    case "kick": {
      if (!canRunCommand(member, "kick")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$kick @user <reason>\``); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await message.reply(`${E.cross} Please provide a reason.`); return; }
      await runKick(message.guild.id, target, member, reason, send);
      break;
    }

    // ─── Role ─────────────────────────────────────────────────────────────────
    case "role": {
      if (!canRunCommand(member, "role")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$role @user <role name or ID>\``); return; }
      const roleResolvable = args.slice(1).join(" ");
      if (!roleResolvable) { await message.reply(`${E.cross} Please provide a role name or ID.`); return; }
      await runRoleByResolvable(message, target, member, roleResolvable, send);
      break;
    }

    // ─── Leaderboard ──────────────────────────────────────────────────────────
    case "leaderboard": {
      if (!canRunCommand(member, "leaderboard")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      await runLeaderboard(message.guild.id, send);
      break;
    }

    // ─── Rank ─────────────────────────────────────────────────────────────────
    case "rank": {
      if (!canRunCommand(member, "rank")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$rank @user <stage 1-5> <High|Mid|Low> <Strong|Stable|Weak>\``); return; }
      const parsed = parseRankArgs(args.slice(1));
      if (!parsed) {
        await message.reply(`${E.cross} Usage: \`$rank @user <stage 1-5> <High|Mid|Low> <Strong|Stable|Weak>\`\nExample: \`$rank @user 3 High Stable\``);
        return;
      }
      await runRank(message.guild.id, target, member, parsed.stage, parsed.midstage, parsed.extrastage, send);
      break;
    }

    // ─── Userinfo ─────────────────────────────────────────────────────────────
    case "userinfo": {
      if (!canRunCommand(member, "userinfo")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$userinfo @user\``); return; }
      await runUserinfo(message.guild.id, target, member, message.client, send);
      break;
    }

    // ─── Info & Config ────────────────────────────────────────────────────────
    case "modinfo": {
      if (!canRunCommand(member, "modinfo")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await message.reply(`${E.cross} Usage: \`$modinfo @user\``); return; }
      await runModinfo(message.guild.id, target.id, target.user.tag, send);
      break;
    }

    case "modlogs": {
      await runModlogs(message, member, args);
      break;
    }

    default:
      break;
  }
}

async function resolveGuildMember(
  message: Message,
  arg: string | undefined,
): Promise<GuildMember | null> {
  if (!arg || !message.guild) return null;
  const userId = extractUserId(arg);
  if (!userId) return null;
  return message.guild.members.fetch(userId).catch(() => null);
}

function extractUserId(arg: string): string | null {
  const mentionMatch = arg.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d+$/.test(arg)) return arg;
  return null;
}
