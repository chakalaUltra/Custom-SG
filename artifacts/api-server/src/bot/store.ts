import type { Client, GuildTextBasedChannel } from "discord.js";
import { logger } from "../lib/logger.js";

const STORE_CHANNEL_ID = "1501175897678413836";
const DATA_PREFIX = "OVERSEER_DATA:";

export interface VerifyRolesConfig {
  verifiedRoleId: string;
  unverifiedRoleId: string;
  mainerRoleId: string;
}

const verifyRolesStore = new Map<string, VerifyRolesConfig>();
const permStore = new Map<string, Set<string>>();

let storeChannel: GuildTextBasedChannel | null = null;

export async function initStore(client: Client): Promise<void> {
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
      { verifyRolesCount: verifyRolesStore.size, permCount: permStore.size },
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
  }
}

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
