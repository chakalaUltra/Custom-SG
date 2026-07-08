import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  MessageFlags,
  type MessageActionRowComponentBuilder,
  type GuildTextBasedChannel,
  Message,
} from "discord.js";
import { C } from "../colors.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "help";

interface CommandEntry {
  slash: string;
  prefix?: string;
  desc: string;
}

interface Section {
  id: string;
  emoji: string;
  emojiRaw: string;
  label: string;
  color: number;
  description: string;
  commands: CommandEntry[];
}

const SECTIONS: Section[] = [
  {
    id: "verification",
    emoji: E.shield,
    emojiRaw: "1000091713",
    label: "Verification",
    color: C.catVerification,
    description: "Commands for verifying members and granting status roles.",
    commands: [
      { slash: "/verify-roles",                          desc: "Set which roles count as Verified and Mainer" },
      { slash: "/verify",  prefix: "v!verify @user",     desc: "Grant a user the Verified role" },
      { slash: "/mainer",  prefix: "v!mainer @user",     desc: "Promote a verified user to Mainer" },
    ],
  },
  {
    id: "warnings",
    emoji: E.bell,
    emojiRaw: "1000091711",
    label: "Warnings",
    color: C.catWarning,
    description: "Issue, view, and remove warnings from a user's record.",
    commands: [
      { slash: "/warn",     prefix: "v!warn @user <reason>",  desc: "Issue a warning to a user" },
      { slash: "/warnings", prefix: "v!warnings @user",       desc: "View all warnings on a user's record" },
      { slash: "/dewarn",   prefix: "v!dewarn @user",         desc: "Remove a specific warning from a user" },
    ],
  },
  {
    id: "moderation",
    emoji: E.cross,
    emojiRaw: "1000091723",
    label: "Moderation",
    color: C.catModeration,
    description: "Core moderation actions — mute, kick, ban, and unban.",
    commands: [
      { slash: "/mute",   prefix: "v!mute @user <duration> <reason>",  desc: "Timeout a user for a set duration" },
      { slash: "/unmute", prefix: "v!unmute @user <reason>",           desc: "Remove an active timeout" },
      { slash: "/kick",   prefix: "v!kick @user <reason>",             desc: "Kick a user from the server" },
      { slash: "/ban",    prefix: "v!ban @user <reason>",              desc: "Permanently ban a user" },
      { slash: "/unban",  prefix: "v!unban <userID> <reason>",         desc: "Lift a ban by user ID" },
    ],
  },
  {
    id: "roles",
    emoji: E.chart,
    emojiRaw: "1000091716",
    label: "Roles & Ranks",
    color: C.catRole,
    description: "Give and remove roles, assign ranks, and configure rank tiers.",
    commands: [
      { slash: "/role",       prefix: "v!role @user <role>",                       desc: "Toggle a role on a user" },
      { slash: "/rank",       prefix: "v!rank @user <stage> <mid> <extra>",       desc: "Assign a full rank to a user" },
      { slash: "/rank-roles",                                                      desc: "Configure roles for each rank tier" },
    ],
  },
  {
    id: "info",
    emoji: E.info,
    emojiRaw: "1000091732",
    label: "Information",
    color: C.catInfo,
    description: "Look up user info, mod history, and staff statistics.",
    commands: [
      { slash: "/userinfo",    prefix: "v!userinfo @user",   desc: "View a user's full info card" },
      { slash: "/modinfo",     prefix: "v!modinfo @user",    desc: "View all mod actions against a user" },
      { slash: "/leaderboard", prefix: "v!leaderboard",      desc: "Top 12 staff ranked by mod actions" },
    ],
  },
  {
    id: "config",
    emoji: E.sliders,
    emojiRaw: "1000091714",
    label: "Configuration",
    color: C.catConfig,
    description: "Manage bot permissions, role access, and log channels.",
    commands: [
      { slash: "/add-perm",  prefix: "v!add-perm @role <cmd>",  desc: "Grant a role access to a command" },
      { slash: "/view-perm", prefix: "v!view-perm @role",        desc: "List all permissions a role has" },
      { slash: "/modlogs",   prefix: "v!modlogs",                desc: "Set the mod log channel" },
    ],
  },
];

function buildOverviewContainer(): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(C.main);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.info}  Vanguard Senate — Command Reference\n` +
      `-# Use \`/command\` (slash) or \`v!command\` (prefix)  ·  Run \`v!<command>\` with no args for a full guide`,
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const overviewLines = SECTIONS.map((s) => {
    const count = s.commands.length;
    return `${s.emoji}  **${s.label}** — ${count} command${count === 1 ? "" : "s"}\n-# ${s.description}`;
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(overviewLines.join("\n\n")),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${E.refresh}  Select a category below to browse its commands`),
  );

  container.addActionRowComponents(buildSelectMenu());

  return container;
}

function buildCategoryContainer(sectionId: string): ContainerBuilder {
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section) return buildOverviewContainer();

  const container = new ContainerBuilder().setAccentColor(section.color);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${section.emoji}  ${section.label}\n-# ${section.description}`,
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const cmdLines = section.commands.map((cmd) => {
    const prefixLine = cmd.prefix
      ? `\`${cmd.slash}\`  ·  \`${cmd.prefix}\``
      : `\`${cmd.slash}\`  ·  *slash only*`;
    return `${E.editCheck}  ${prefixLine}\n-# ${cmd.desc}`;
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(cmdLines.join("\n\n")),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${E.info}  Viewing **${section.label}** · Switch category below or run \`;<command>\` for a detailed guide`,
    ),
  );

  container.addActionRowComponents(buildSelectMenu(sectionId));

  return container;
}

function buildSelectMenu(selectedId?: string): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help:category")
    .setPlaceholder(selectedId ? `Viewing: ${SECTIONS.find(s => s.id === selectedId)?.label}` : "Browse a category…");

  for (const section of SECTIONS) {
    const option = new StringSelectMenuOptionBuilder()
      .setValue(section.id)
      .setLabel(section.label)
      .setDescription(section.description.slice(0, 100));

    if (section.id === selectedId) option.setDefault(true);
    menu.addOptions(option);
  }

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(menu);
}

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Browse all available commands");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [buildOverviewContainer()],
  });
}

export async function runHelp(message: Message): Promise<void> {
  await (message.channel as GuildTextBasedChannel).send({
    flags: MessageFlags.IsComponentsV2,
    components: [buildOverviewContainer()],
  });
}

export async function handleHelpSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const categoryId = interaction.values[0];
  if (!categoryId) return;

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [buildCategoryContainer(categoryId)],
  });
}
