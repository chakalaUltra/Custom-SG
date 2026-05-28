import { GuildMember, PermissionFlagsBits } from "discord.js";
import { hasRolePerm } from "./store.js";

export function canRunCommand(member: GuildMember, commandName: string): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const roleIds = [...member.roles.cache.keys()];
  return hasRolePerm(member.guild.id, roleIds, commandName);
}
