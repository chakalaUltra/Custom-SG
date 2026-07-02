# Vanguard Senate

A custom Discord moderation bot for the Vanguard Senate server. Handles member verification, mainer status, moderation actions, and role-based command permissions. Uses a Discord channel as a persistent data store.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Discord bot (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `DISCORD_BOT_TOKEN` — Discord bot token (set in Replit Secrets)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Discord: discord.js v14
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/bot/` — all bot code
  - `index.ts` — bot startup, command/event registration, select menu handling
  - `store.ts` — Discord-channel-backed persistent data store
  - `permissions.ts` — admin + role permission checks
  - `components.ts` — Discord v2 container message builders
  - `modlog.ts` — mod log embed builder + dispatch
  - `prefix-handler.ts` — `$` prefix command router
  - `commands/` — individual slash command handlers

## Architecture decisions

- **Data store is a Discord channel** (ID: `1501175897678413836`). On startup the bot reads up to 100 messages from that channel and hydrates an in-memory Map. Writes append new messages — latest entry per key wins.
- **All commands are admin-only by default.** Role permissions are layered on top via `/add-perm`.
- **`add-perm` and `modlogs` are strictly admin-only** — they cannot be granted to any role.
- **Discord v2 container components** (`MessageFlags.IsComponentsV2`, `ContainerBuilder`) are used for post-action confirmation messages.
- **Mod logs** are sent as colored embeds to a configurable channel set via `/modlogs`.
- Bot runs alongside the Express server in the same Node.js process.

## Bot Commands

| Command | Prefix | Description |
|---|---|---|
| `/verify-roles` | slash only | Set verified/unverified/mainer roles for the server |
| `/verify <user>` | `$verify <user>` | Give verified role, remove unverified |
| `/mainer <user>` | `$mainer <user>` | Give mainer + verified roles, remove unverified |
| `/add-perm <role> <command>` | `$add-perm @role <cmd>` | Grant a role access to a command (admin only) |
| `/warn <user> <reason>` | `$warn @user <reason>` | Issue a warning to a user |
| `/warnings <user>` | `$warnings @user` | View all warnings for a user |
| `/dewarn <user>` | `$dewarn @user` | Remove a warning via dropdown select menu |
| `/mute <user> <duration> <reason>` | `$mute @user <dur> <reason>` | Timeout a user (e.g. `10m`, `2h`, `1d`) |
| `/unmute <user> <reason>` | `$unmute @user <reason>` | Remove a timeout |
| `/ban <user> <reason>` | `$ban @user <reason>` | Ban a user |
| `/unban <userid> <reason>` | `$unban <ID> <reason>` | Unban a user by ID |
| `/kick <user> <reason>` | `$kick @user <reason>` | Kick a user |
| `/modinfo <user>` | `$modinfo @user` | View a moderator's action stats |
| `/modlogs <channel>` | `$modlogs #channel` | Set the mod log channel (admin only) |

## Bot Setup Checklist

1. Invite bot with **Manage Roles**, **Send Messages**, **Kick Members**, **Ban Members**, **Moderate Members** permissions
2. Enable **Server Members Intent** and **Message Content Intent** in Discord Dev Portal → Bot → Privileged Gateway Intents
3. Move bot's role **above** the roles it needs to assign
4. Run `/verify-roles` to configure the verification role trio
5. Run `/modlogs #channel` to set where mod action logs appear

## User preferences

- Bot prefix: `$`
- Data storage: Discord channel `1501175897678413836`

## Gotchas

- The bot needs **Message Content Intent** enabled in the Discord Developer Portal for `$` prefix commands to work.
- The bot's role must be **higher than** the roles it assigns in the role hierarchy.
- Slash commands are registered **globally** — they can take up to 1 hour to propagate to all Discord clients after the first registration.
- The data store reads only the last 100 messages from the store channel. If data volume grows large, older entries may not load on restart.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
