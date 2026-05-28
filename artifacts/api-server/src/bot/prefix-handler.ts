import { Message, GuildMember, type GuildTextBasedChannel } from "discord.js";
import { canRunCommand } from "./permissions.js";
import { runVerify } from "./commands/verify.js";
import { runMainer } from "./commands/mainer.js";
import { runAddPerm } from "./commands/add-perm.js";
import { logger } from "../lib/logger.js";

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

  logger.info({ commandName, args, userId: message.author.id }, "Prefix command received");

  switch (commandName) {
    case "verify": {
      if (!canRunCommand(member, "verify")) {
        await message.reply("❌ You do not have permission to use this command.");
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) {
        await message.reply("❌ Usage: `$verify @user` or `$verify USER_ID`");
        return;
      }
      await runVerify(target, member, async (payload) => {
        await (message.channel as GuildTextBasedChannel).send(payload as Parameters<GuildTextBasedChannel["send"]>[0]);
      });
      break;
    }

    case "mainer": {
      if (!canRunCommand(member, "mainer")) {
        await message.reply("❌ You do not have permission to use this command.");
        return;
      }
      const target = await resolveGuildMember(message, args[0]);
      if (!target) {
        await message.reply("❌ Usage: `$mainer @user` or `$mainer USER_ID`");
        return;
      }
      await runMainer(target, member, async (payload) => {
        await (message.channel as GuildTextBasedChannel).send(payload as Parameters<GuildTextBasedChannel["send"]>[0]);
      });
      break;
    }

    case "add-perm": {
      await runAddPerm(message, member, args);
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

  const mentionMatch = arg.match(/^<@!?(\d+)>$/);
  const userId = mentionMatch ? mentionMatch[1] : /^\d+$/.test(arg) ? arg : null;
  if (!userId) return null;

  return message.guild.members.fetch(userId).catch(() => null);
}
