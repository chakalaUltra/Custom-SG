import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { initStore } from "./store.js";
import { handlePrefixMessage } from "./prefix-handler.js";
import { handleDewarnSelect } from "./commands/dewarn.js";
import * as verifyRolesCmd from "./commands/verify-roles.js";
import * as verifyCmd from "./commands/verify.js";
import * as mainerCmd from "./commands/mainer.js";
import * as addPermCmd from "./commands/add-perm.js";
import * as warnCmd from "./commands/warn.js";
import * as warningsCmd from "./commands/warnings.js";
import * as dewarnCmd from "./commands/dewarn.js";
import * as muteCmd from "./commands/mute.js";
import * as unmuteCmd from "./commands/unmute.js";
import * as banCmd from "./commands/ban.js";
import * as unbanCmd from "./commands/unban.js";
import * as kickCmd from "./commands/kick.js";
import * as modinfoCmd from "./commands/modinfo.js";
import * as modlogsCmd from "./commands/modlogs.js";

interface Command {
  data: { toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set("verify-roles", verifyRolesCmd);
commands.set("verify", verifyCmd);
commands.set("mainer", mainerCmd);
commands.set("add-perm", addPermCmd);
commands.set("warn", warnCmd);
commands.set("warnings", warningsCmd);
commands.set("dewarn", dewarnCmd);
commands.set("mute", muteCmd);
commands.set("unmute", unmuteCmd);
commands.set("ban", banCmd);
commands.set("unban", unbanCmd);
commands.set("kick", kickCmd);
commands.set("modinfo", modinfoCmd);
commands.set("modlogs", modlogsCmd);

export function startBot(): void {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.error("DISCORD_BOT_TOKEN is not set — bot will not start");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
  });

  client.once("clientReady", async (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "SG Overseer is online");
    await initStore(client);
    await registerSlashCommands(token, readyClient.user.id);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction as ChatInputCommandInteraction);
      } catch (err) {
        logger.error({ err, command: interaction.commandName }, "Error executing slash command");
        const msg = { content: "❌ An error occurred while running that command.", ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("dewarn:")) {
        try {
          await handleDewarnSelect(interaction as StringSelectMenuInteraction);
        } catch (err) {
          logger.error({ err }, "Error handling dewarn select menu");
          await (interaction as StringSelectMenuInteraction).update({
            content: "❌ An error occurred while removing the warning.",
            components: [],
          }).catch(() => {});
        }
      }
    }
  });

  client.on("messageCreate", async (message) => {
    try {
      await handlePrefixMessage(message);
    } catch (err) {
      logger.error({ err }, "Error handling prefix command");
    }
  });

  client.on("error", (err) => {
    logger.error({ err }, "Discord client error");
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to log in to Discord");
  });
}

async function registerSlashCommands(
  token: string,
  clientId: string,
): Promise<void> {
  const rest = new REST().setToken(token);
  const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    logger.info({ count: commandData.length }, "Registered global slash commands");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
