import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { initStore } from "./store.js";
import { handlePrefixMessage } from "./prefix-handler.js";
import * as verifyRolesCmd from "./commands/verify-roles.js";
import * as verifyCmd from "./commands/verify.js";
import * as mainerCmd from "./commands/mainer.js";
import * as addPermCmd from "./commands/add-perm.js";

interface Command {
  data: { toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set("verify-roles", verifyRolesCmd);
commands.set("verify", verifyCmd);
commands.set("mainer", mainerCmd);
commands.set("add-perm", addPermCmd);

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

  client.once("ready", async (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "SG Overseer is online");

    await initStore(client);
    await registerSlashCommands(token, readyClient.user.id);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Error executing slash command");
      const msg = { content: "❌ An error occurred while running that command.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
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
