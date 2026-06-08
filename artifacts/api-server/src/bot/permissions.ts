import { GuildMember, PermissionFlagsBits } from "discord.js";
import { hasRolePerm } from "./store.js";

const BOT_OWNER_ID = "1117540437016727612";

export function isBotOwner(userId: string): boolean {
  return userId === BOT_OWNER_ID;
}

export function canRunCommand(member: GuildMember, commandName: string): boolean {
  if (isBotOwner(member.id)) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const roleIds = [...member.roles.cache.keys()];
  return hasRolePerm(member.guild.id, roleIds, commandName);
}
