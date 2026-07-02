import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  type ButtonInteraction,
  type RoleSelectMenuInteraction,
  type ChannelSelectMenuInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { initStore } from "./store.js";
import { handlePrefixMessage } from "./prefix-handler.js";
import { handleDewarnSelect } from "./commands/dewarn.js";
import { handleHelpSelect } from "./commands/help.js";
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
import * as roleCmd from "./commands/role.js";
import * as leaderboardCmd from "./commands/leaderboard.js";
import * as rankCmd from "./commands/rank.js";
import * as rankRolesCmd from "./commands/rank-roles.js";
import * as userinfoCmd from "./commands/userinfo.js";
import * as viewPermCmd from "./commands/view-perm.js";
import * as helpCmd from "./commands/help.js";
import * as wizardCmd from "./commands/wizard.js";
import {
  handleWizardButton,
  handleWizardRoleSelect,
  handleWizardChannelSelect,
} from "./commands/wizard.js";

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
commands.set("role", roleCmd);
commands.set("leaderboard", leaderboardCmd);
commands.set("rank", rankCmd);
commands.set("rank-roles", rankRolesCmd);
commands.set("userinfo", userinfoCmd);
commands.set("view-perm", viewPermCmd);
commands.set("help", helpCmd);
commands.set("wizard", wizardCmd);

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
    logger.info({ tag: readyClient.user.tag }, "Vanguard Senate is online");
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
        const msg = { content: "An error occurred while running that command.", ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("wizard:")) {
        try {
          await handleWizardButton(interaction as ButtonInteraction);
        } catch (err) {
          logger.error({ err }, "Error handling wizard button");
          await (interaction as ButtonInteraction).reply({ content: "An error occurred.", ephemeral: true }).catch(() => {});
        }
        return;
      }
    }

    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId.startsWith("wizard:")) {
        try {
          await handleWizardRoleSelect(interaction as RoleSelectMenuInteraction);
        } catch (err) {
          logger.error({ err }, "Error handling wizard role select");
        }
        return;
      }
    }

    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId.startsWith("wizard:")) {
        try {
          await handleWizardChannelSelect(interaction as ChannelSelectMenuInteraction);
        } catch (err) {
          logger.error({ err }, "Error handling wizard channel select");
        }
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("dewarn:")) {
        try {
          await handleDewarnSelect(interaction as StringSelectMenuInteraction);
        } catch (err) {
          logger.error({ err }, "Error handling dewarn select menu");
          await (interaction as StringSelectMenuInteraction).update({
            content: "An error occurred while removing the warning.",
            components: [],
          }).catch(() => {});
        }
        return;
      }

      if (interaction.customId === "help:category") {
        try {
          await handleHelpSelect(interaction as StringSelectMenuInteraction);
        } catch (err) {
          logger.error({ err }, "Error handling help category select");
        }
        return;
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
