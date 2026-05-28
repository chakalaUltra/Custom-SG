import type { Client, GuildTextBasedChannel } from "discord.js";
import { logger } from "../lib/logger.js";

const STORE_CHANNEL_ID = "1501175897678413836";
const DATA_PREFIX = "OVERSEER_DATA:";

export interface VerifyRolesConfig {
  verifiedRoleId: string;
  unverifiedRoleId: string;
  mainerRoleId: string;
}

export interface Warning {
  id: string;
  reason: string;
  moderatorId: string;
  moderatorTag: string;
  timestamp: number;
}

export type ModActionType =
  | "warn"
  | "dewarn"
  | "kick"
  | "ban"
  | "unban"
  | "mute"
  | "unmute"
  | "verify"
  | "mainer"
  | "role"
  | "rank";

export interface ModAction {
  id: string;
  type: ModActionType;
  moderatorId: string;
  moderatorTag: string;
  targetId: string;
  targetTag: string;
  reason?: string;
  duration?: number;
  timestamp: number;
}

export interface UserRank {
  stage: number;
  midstage: string;
  extrastage: string;
}

export interface RankRolesConfig {
  stages: Partial<Record<string, string>>;
  midstages: Partial<Record<string, string>>;
  extrastages: Partial<Record<string, string>>;
}

const verifyRolesStore = new Map<string, VerifyRolesConfig>();
const permStore = new Map<string, Set<string>>();
const warnStore = new Map<string, Map<string, Warning>>();
const modActionStore = new Map<string, ModAction[]>();
const modLogsChannelStore = new Map<string, string>();
const userRankStore = new Map<string, UserRank>();
const rankRolesStore = new Map<string, RankRolesConfig>();

let storeChannel: GuildTextBasedChannel | null = null;
let discordClient: Client | null = null;

export async function initStore(client: Client): Promise<void> {
  discordClient = client;
  try {
    const ch = await client.channels.fetch(STORE_CHANNEL_ID);
    if (!ch || !ch.isTextBased() || ch.isDMBased()) {
      logger.warn({ channelId: STORE_CHANNEL_ID }, "Store channel not found or not a guild text channel");
      return;
    }
    storeChannel = ch as GuildTextBasedChannel;

    const messages = await ch.messages.fetch({ limit: 100 });
    const sorted = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );

    for (const msg of sorted) {
      if (!msg.content.startsWith(DATA_PREFIX)) continue;
      try {
        const parsed = JSON.parse(msg.content.slice(DATA_PREFIX.length)) as {
          key: string;
          value: unknown;
        };
        applyEntry(parsed.key, parsed.value);
      } catch {
        // skip malformed messages
      }
    }

    logger.info(
      {
        verifyRolesCount: verifyRolesStore.size,
        permCount: permStore.size,
        warnUsers: warnStore.size,
        modActions: [...modActionStore.values()].reduce((a, v) => a + v.length, 0),
      },
      "Store initialized from Discord channel",
    );
  } catch (err) {
    logger.error({ err }, "Failed to initialize store from Discord channel");
  }
}

function applyEntry(key: string, value: unknown): void {
  if (key.startsWith("verify-roles:")) {
    const guildId = key.slice("verify-roles:".length);
    verifyRolesStore.set(guildId, value as VerifyRolesConfig);
  } else if (key.startsWith("perm:")) {
    const parts = key.split(":");
    if (parts.length < 4) return;
    const guildId = parts[1];
    const roleId = parts[2];
    const command = parts.slice(3).join(":");
    const storeKey = `${guildId}:${roleId}`;
    if (!permStore.has(storeKey)) permStore.set(storeKey, new Set());
    if (value === true) {
      permStore.get(storeKey)!.add(command);
    } else {
      permStore.get(storeKey)!.delete(command);
    }
  } else if (key.startsWith("warn:")) {
    const parts = key.split(":");
    if (parts.length < 4) return;
    const guildId = parts[1];
    const userId = parts[2];
    const warnId = parts[3];
    const userKey = `${guildId}:${userId}`;
    if (!warnStore.has(userKey)) warnStore.set(userKey, new Map());
    if (value === null) {
      warnStore.get(userKey)!.delete(warnId);
    } else {
      warnStore.get(userKey)!.set(warnId, value as Warning);
    }
  } else if (key.startsWith("modaction:")) {
    const parts = key.split(":");
    if (parts.length < 3) return;
    const guildId = parts[1];
    if (!modActionStore.has(guildId)) modActionStore.set(guildId, []);
    modActionStore.get(guildId)!.push(value as ModAction);
  } else if (key.startsWith("modlogs:")) {
    const guildId = key.slice("modlogs:".length);
    modLogsChannelStore.set(guildId, (value as { channelId: string }).channelId);
  } else if (key.startsWith("rank:")) {
    const parts = key.split(":");
    if (parts.length < 3) return;
    const guildId = parts[1];
    const userId = parts[2];
    const userKey = `${guildId}:${userId}`;
    if (value === null) {
      userRankStore.delete(userKey);
    } else {
      userRankStore.set(userKey, value as UserRank);
    }
  } else if (key.startsWith("rank-roles:")) {
    const guildId = key.slice("rank-roles:".length);
    rankRolesStore.set(guildId, value as RankRolesConfig);
  }
}

export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Verify Roles ────────────────────────────────────────────────────────────

export function getVerifyRoles(guildId: string): VerifyRolesConfig | undefined {
  return verifyRolesStore.get(guildId);
}

export async function saveVerifyRoles(
  guildId: string,
  config: VerifyRolesConfig,
): Promise<void> {
  verifyRolesStore.set(guildId, config);
  await writeToChannel(`verify-roles:${guildId}`, config);
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export function hasRolePerm(
  guildId: string,
  roleIds: readonly string[],
  command: string,
): boolean {
  for (const roleId of roleIds) {
    const perms = permStore.get(`${guildId}:${roleId}`);
    if (perms?.has(command)) return true;
  }
  return false;
}

export async function saveCommandPerm(
  guildId: string,
  roleId: string,
  command: string,
): Promise<void> {
  const storeKey = `${guildId}:${roleId}`;
  if (!permStore.has(storeKey)) permStore.set(storeKey, new Set());
  permStore.get(storeKey)!.add(command);
  await writeToChannel(`perm:${guildId}:${roleId}:${command}`, true);
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

export function getWarnings(guildId: string, userId: string): Warning[] {
  return [...(warnStore.get(`${guildId}:${userId}`)?.values() ?? [])].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
}

export async function addWarning(
  guildId: string,
  userId: string,
  warning: Warning,
): Promise<void> {
  const userKey = `${guildId}:${userId}`;
  if (!warnStore.has(userKey)) warnStore.set(userKey, new Map());
  warnStore.get(userKey)!.set(warning.id, warning);
  await writeToChannel(`warn:${guildId}:${userId}:${warning.id}`, warning);
}

export async function removeWarning(
  guildId: string,
  userId: string,
  warnId: string,
): Promise<void> {
  warnStore.get(`${guildId}:${userId}`)?.delete(warnId);
  await writeToChannel(`warn:${guildId}:${userId}:${warnId}`, null);
}

// ─── Mod Actions ──────────────────────────────────────────────────────────────

export async function saveModAction(
  guildId: string,
  action: ModAction,
): Promise<void> {
  if (!modActionStore.has(guildId)) modActionStore.set(guildId, []);
  modActionStore.get(guildId)!.push(action);
  await writeToChannel(`modaction:${guildId}:${action.id}`, action);
}

export function getModActionsByModerator(
  guildId: string,
  moderatorId: string,
): ModAction[] {
  return (modActionStore.get(guildId) ?? []).filter(
    (a) => a.moderatorId === moderatorId,
  );
}

export function getAllModActions(guildId: string): ModAction[] {
  return modActionStore.get(guildId) ?? [];
}

export function getVerifierForUser(guildId: string, userId: string): ModAction | undefined {
  return (modActionStore.get(guildId) ?? [])
    .filter((a) => a.type === "verify" && a.targetId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

// ─── Mod Logs Channel ─────────────────────────────────────────────────────────

export function getModLogsChannelId(guildId: string): string | undefined {
  return modLogsChannelStore.get(guildId);
}

export async function saveModLogsChannel(
  guildId: string,
  channelId: string,
): Promise<void> {
  modLogsChannelStore.set(guildId, channelId);
  await writeToChannel(`modlogs:${guildId}`, { channelId });
}

export async function sendModLog(
  guildId: string,
  embed: object,
): Promise<void> {
  const channelId = modLogsChannelStore.get(guildId);
  if (!channelId || !discordClient) return;
  try {
    const ch = await discordClient.channels.fetch(channelId);
    if (!ch || !ch.isTextBased() || ch.isDMBased()) return;
    await (ch as GuildTextBasedChannel).send({ embeds: [embed as never] });
  } catch (err) {
    logger.warn({ err, guildId, channelId }, "Failed to send mod log");
  }
}

// ─── User Ranks ──────────────────────────────────────────────────────────────

export function getUserRank(guildId: string, userId: string): UserRank | undefined {
  return userRankStore.get(`${guildId}:${userId}`);
}

export async function saveUserRank(
  guildId: string,
  userId: string,
  rank: UserRank,
): Promise<void> {
  userRankStore.set(`${guildId}:${userId}`, rank);
  await writeToChannel(`rank:${guildId}:${userId}`, rank);
}

// ─── Rank Roles ──────────────────────────────────────────────────────────────

export function getRankRoles(guildId: string): RankRolesConfig | undefined {
  return rankRolesStore.get(guildId);
}

export async function saveRankRoles(
  guildId: string,
  config: RankRolesConfig,
): Promise<void> {
  rankRolesStore.set(guildId, config);
  await writeToChannel(`rank-roles:${guildId}`, config);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function writeToChannel(key: string, value: unknown): Promise<void> {
  if (!storeChannel) {
    logger.warn("Store channel not initialized — data not persisted");
    return;
  }
  try {
    await storeChannel.send(
      `${DATA_PREFIX}${JSON.stringify({ key, value })}`,
    );
  } catch (err) {
    logger.error({ err, key }, "Failed to write to store channel");
  }
}
