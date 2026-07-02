import { Message, GuildMember, type GuildTextBasedChannel } from "discord.js";
import { canRunCommand } from "./permissions.js";
import { runVerify } from "./commands/verify.js";
import { runMainer } from "./commands/mainer.js";
import { runAddPerm } from "./commands/add-perm.js";
import { runViewPerm } from "./commands/view-perm.js";
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
import { runHelp } from "./commands/help.js";
import { replyWithGuide } from "./guides.js";
import { logger } from "../lib/logger.js";
import { E } from "./emojis.js";

const PREFIX = ";";

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
    // ─── Help ─────────────────────────────────────────────────────────────────
    case "help": {
      await runHelp(message);
      break;
    }

    // ─── Verification ────────────────────────────────────────────────────────
    case "verify": {
      if (!canRunCommand(member, "verify")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "verify"); return; }
      await runVerify(target, member, send);
      break;
    }

    case "mainer": {
      if (!canRunCommand(member, "mainer")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "mainer"); return; }
      await runMainer(target, member, send);
      break;
    }

    case "add-perm": {
      if (args.length < 2) { await replyWithGuide(message, "add-perm"); return; }
      await runAddPerm(message, member, args);
      break;
    }

    case "view-perm": {
      await runViewPerm(message, member, args);
      break;
    }

    // ─── Warnings ────────────────────────────────────────────────────────────
    case "warn": {
      if (!canRunCommand(member, "warn")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "warn"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "warn"); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await replyWithGuide(message, "warn"); return; }
      await runWarn(message.guild.id, target.id, target.user.tag, member, reason, send);
      break;
    }

    case "warnings": {
      if (!canRunCommand(member, "warnings")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "warnings"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "warnings"); return; }
      await runWarnings(message.guild.id, target.id, target.user.tag, send);
      break;
    }

    case "dewarn": {
      if (!canRunCommand(member, "dewarn")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "dewarn"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "dewarn"); return; }
      await sendDewarnMenu(message.guild.id, target.id, target.user.tag, send);
      break;
    }

    // ─── Mod Actions ─────────────────────────────────────────────────────────
    case "mute": {
      if (!canRunCommand(member, "mute")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "mute"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "mute"); return; }
      const duration = args[1];
      if (!duration) { await replyWithGuide(message, "mute"); return; }
      const reason = args.slice(2).join(" ");
      if (!reason) { await replyWithGuide(message, "mute"); return; }
      await runMute(message.guild.id, target, member, duration, reason, send);
      break;
    }

    case "unmute": {
      if (!canRunCommand(member, "unmute")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "unmute"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "unmute"); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await replyWithGuide(message, "unmute"); return; }
      await runUnmute(message.guild.id, target, member, reason, send);
      break;
    }

    case "ban": {
      if (!canRunCommand(member, "ban")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "ban"); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await replyWithGuide(message, "ban"); return; }
      const userId = extractUserId(args[0]);
      if (!userId) { await replyWithGuide(message, "ban"); return; }
      const target = await message.guild.members.fetch(userId).catch(() => null);
      await runBan(message.guild.id, userId, target?.user.tag ?? userId, target, member, reason, send);
      break;
    }

    case "unban": {
      if (!canRunCommand(member, "unban")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "unban"); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await replyWithGuide(message, "unban"); return; }
      const userId = extractUserId(args[0]);
      if (!userId) { await replyWithGuide(message, "unban"); return; }
      await runUnban(message.guild.id, userId, member, reason, send, message.client);
      break;
    }

    case "kick": {
      if (!canRunCommand(member, "kick")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "kick"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "kick"); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await replyWithGuide(message, "kick"); return; }
      await runKick(message.guild.id, target, member, reason, send);
      break;
    }

    // ─── Role ─────────────────────────────────────────────────────────────────
    case "role": {
      if (!canRunCommand(member, "role")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "role"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "role"); return; }
      const roleResolvable = args.slice(1).join(" ");
      if (!roleResolvable) { await replyWithGuide(message, "role"); return; }
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
      if (!args[0]) { await replyWithGuide(message, "rank"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "rank"); return; }
      const parsed = parseRankArgs(args.slice(1));
      if (!parsed) { await replyWithGuide(message, "rank"); return; }
      await runRank(message.guild.id, target, member, parsed.stage, parsed.midstage, parsed.extrastage, send);
      break;
    }

    // ─── Userinfo ─────────────────────────────────────────────────────────────
    case "userinfo": {
      if (!canRunCommand(member, "userinfo")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "userinfo"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "userinfo"); return; }
      await runUserinfo(message.guild.id, target, member, message.client, send);
      break;
    }

    // ─── Info & Config ────────────────────────────────────────────────────────
    case "modinfo": {
      if (!canRunCommand(member, "modinfo")) {
        await message.reply(`${E.cross} You do not have permission to use this command.`);
        return;
      }
      if (!args[0]) { await replyWithGuide(message, "modinfo"); return; }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) { await replyWithGuide(message, "modinfo"); return; }
      await runModinfo(message.guild.id, target.id, target.user.tag, send);
      break;
    }

    case "modlogs": {
      if (args.length === 0) { await replyWithGuide(message, "modlogs"); return; }
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
  if (mentionMatch) return mentionMatch[1]!;
  if (/^\d+$/.test(arg)) return arg;
  return null;
}
