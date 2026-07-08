import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  RoleSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  PermissionFlagsBits,
  GuildMember,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  type MessageActionRowComponentBuilder,
  type GuildTextBasedChannel,
  Message,
} from "discord.js";
import {
  saveVerifyRoles,
  saveModLogsChannel,
  getVerifyRoles,
  getModLogsChannelId,
} from "../store.js";
import { E } from "../emojis.js";
import { C } from "../colors.js";

export const COMMAND_NAME = "wizard";

// ─── Session state ────────────────────────────────────────────────────────────

interface WizardState {
  verifiedRoleId?: string;
  unverifiedRoleId?: string;
  mainerRoleId?: string;
  modlogsChannelId?: string;
}

const sessions = new Map<string, WizardState>();

function key(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

// ─── Container builders ───────────────────────────────────────────────────────

function buildWelcome(): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(C.yellow);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.sliders}  Setup Wizard\n-# Vanguard Senate — walk through your server configuration step by step`,
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `> ${E.shield}  **Step 1** — Verification Roles`,
        `> -# Set the Verified, Unverified, and Mainer roles`,
        `> ${E.message}  **Step 2** — Mod Log Channel`,
        `> -# Choose where mod actions are logged`,
        `> ${E.plus}  **Step 3** — Role Permissions`,
        `> -# Grant roles access to specific bot commands`,
      ].join("\n"),
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ◈  Each step has a Skip button — configure individually later if needed`,
    ),
  );
  c.addActionRowComponents(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("wizard:start")
        .setLabel("Begin Setup")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("wizard:cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return c;
}

function buildVerifyStep(state: WizardState): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(C.yellow);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.shield}  Step 1 / 3 — Verification Roles\n` +
      `-# Used by \`/verify\` and \`/mainer\``,
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  // Show confirmed selections
  const confirmed: string[] = [];
  if (state.verifiedRoleId)   confirmed.push(`> ${E.check}  **Verified** — <@&${state.verifiedRoleId}>`);
  if (state.unverifiedRoleId) confirmed.push(`> ${E.check}  **Unverified** — <@&${state.unverifiedRoleId}>`);
  if (state.mainerRoleId)     confirmed.push(`> ${E.check}  **Mainer** — <@&${state.mainerRoleId}>`);
  if (confirmed.length) {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(confirmed.join("\n")));
  }

  // Show next role select
  if (!state.verifiedRoleId) {
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> ${E.info}  Select the **Verified** role — given to members when they pass verification`,
      ),
    );
    c.addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId("wizard:sel:verified")
          .setPlaceholder("Select Verified role…"),
      ),
    );
  } else if (!state.unverifiedRoleId) {
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> ${E.info}  Select the **Unverified** role — removed when a member is verified`,
      ),
    );
    c.addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId("wizard:sel:unverified")
          .setPlaceholder("Select Unverified role…"),
      ),
    );
  } else if (!state.mainerRoleId) {
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> ${E.info}  Select the **Mainer** role — given to certified mainstay members`,
      ),
    );
    c.addActionRowComponents(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId("wizard:sel:mainer")
          .setPlaceholder("Select Mainer role…"),
      ),
    );
  }

  c.addActionRowComponents(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("wizard:skip:verify")
        .setLabel("Skip this step →")
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return c;
}

function buildModlogsStep(): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(C.yellow);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.message}  Step 2 / 3 — Mod Log Channel\n` +
      `-# Pick the channel where moderation actions are posted`,
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> ${E.info}  Bans, kicks, warns, mutes, and other actions will be posted here as mod log entries`,
    ),
  );
  c.addActionRowComponents(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("wizard:sel:modlogs")
        .setPlaceholder("Select a text channel…")
        .setChannelTypes(ChannelType.GuildText),
    ),
  );
  c.addActionRowComponents(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("wizard:skip:modlogs")
        .setLabel("Skip this step →")
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return c;
}

function buildPermissionsStep(): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(C.yellow);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.plus}  Step 3 / 3 — Role Permissions\n` +
      `-# Grant non-admin roles access to specific bot commands`,
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> ${E.info}  By default every command requires Administrator\n` +
      `> ${E.editCheck}  Use \`/add-perm\` or \`v!add-perm\` to grant roles command access\n` +
      `> -# Example: \`v!add-perm @Moderator warn\``,
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ◈  \`/wizard\` and \`/add-perm\` are strictly admin-only and cannot be granted to any role`,
    ),
  );
  c.addActionRowComponents(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("wizard:finish")
        .setLabel("Finish Setup")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("wizard:skip:permissions")
        .setLabel("Skip →")
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return c;
}

function buildDone(state: WizardState, guildId: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(C.yellow);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.check}  Setup Complete\n-# Vanguard Senate is configured and ready`,
    ),
  );
  c.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  const lines: string[] = [];

  if (state.verifiedRoleId && state.unverifiedRoleId && state.mainerRoleId) {
    lines.push(
      `> ${E.shield}  **Verification Roles** — configured\n` +
      `> -# Verified <@&${state.verifiedRoleId}> · Unverified <@&${state.unverifiedRoleId}> · Mainer <@&${state.mainerRoleId}>`,
    );
  } else {
    const ex = getVerifyRoles(guildId);
    if (ex) {
      lines.push(
        `> ${E.shield}  **Verification Roles** — existing config kept\n` +
        `> -# Verified <@&${ex.verifiedRoleId}> · Unverified <@&${ex.unverifiedRoleId}> · Mainer <@&${ex.mainerRoleId}>`,
      );
    } else {
      lines.push(`> ${E.dots}  **Verification Roles** — not configured · run \`/verify-roles\` to set up`);
    }
  }

  if (state.modlogsChannelId) {
    lines.push(`> ${E.message}  **Mod Log Channel** — <#${state.modlogsChannelId}>`);
  } else {
    const ex = getModLogsChannelId(guildId);
    if (ex) {
      lines.push(`> ${E.message}  **Mod Log Channel** — <#${ex}> *(existing)*`);
    } else {
      lines.push(`> ${E.dots}  **Mod Log Channel** — not configured · run \`/modlogs\` to set up`);
    }
  }

  lines.push(`> ${E.plus}  **Role Permissions** — use \`/add-perm\` or \`v!add-perm\` to grant roles command access`);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.join("\n")),
  );
  return c;
}

function buildCancelled(): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(C.yellow);
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${E.cross}  Setup Cancelled\n-# No changes were made  ·  Run \`/wizard\` to start again`,
    ),
  );
  return c;
}

// ─── Slash command ────────────────────────────────────────────────────────────

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Interactive setup wizard — configure verification, logs, and permissions")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: `${E.cross} Server only.`, ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: `${E.cross} Admins only.`, ephemeral: true });
    return;
  }
  sessions.set(key(interaction.guild.id, interaction.user.id), {});
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [buildWelcome()],
  } as never);
}

// ─── Prefix variant ───────────────────────────────────────────────────────────

export async function runWizard(message: Message, executor: GuildMember): Promise<void> {
  if (!message.guild) return;
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await message.reply(`${E.cross} Admins only.`);
    return;
  }
  sessions.set(key(message.guild.id, message.author.id), {});
  await (message.channel as GuildTextBasedChannel).send({
    flags: MessageFlags.IsComponentsV2,
    components: [buildWelcome()],
  } as never);
}

// ─── Button handler ───────────────────────────────────────────────────────────

export async function handleWizardButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: `${E.cross} Admins only.`, ephemeral: true });
    return;
  }

  const k = key(interaction.guild.id, interaction.user.id);
  const id = interaction.customId;

  if (id === "wizard:cancel") {
    sessions.delete(k);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildCancelled()],
    } as never);
    return;
  }

  const state: WizardState = sessions.get(k) ?? {};

  if (id === "wizard:start") {
    sessions.set(k, state);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildVerifyStep(state)],
    } as never);
    return;
  }

  if (id === "wizard:skip:verify") {
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildModlogsStep()],
    } as never);
    return;
  }

  if (id === "wizard:skip:modlogs") {
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildPermissionsStep()],
    } as never);
    return;
  }

  if (id === "wizard:skip:permissions" || id === "wizard:finish") {
    sessions.delete(k);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildDone(state, interaction.guild.id)],
    } as never);
    return;
  }
}

// ─── Role select handler ──────────────────────────────────────────────────────

export async function handleWizardRoleSelect(interaction: RoleSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) return;
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: `${E.cross} Admins only.`, ephemeral: true });
    return;
  }

  const k = key(interaction.guild.id, interaction.user.id);
  const state: WizardState = sessions.get(k) ?? {};
  const roleId = interaction.values[0];
  if (!roleId) return;

  if (interaction.customId === "wizard:sel:verified") {
    state.verifiedRoleId = roleId;
    sessions.set(k, state);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildVerifyStep(state)],
    } as never);
    return;
  }

  if (interaction.customId === "wizard:sel:unverified") {
    state.unverifiedRoleId = roleId;
    sessions.set(k, state);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildVerifyStep(state)],
    } as never);
    return;
  }

  if (interaction.customId === "wizard:sel:mainer") {
    state.mainerRoleId = roleId;
    sessions.set(k, state);
    // All three set — save and advance
    await saveVerifyRoles(interaction.guild.id, {
      verifiedRoleId: state.verifiedRoleId!,
      unverifiedRoleId: state.unverifiedRoleId!,
      mainerRoleId: state.mainerRoleId,
    });
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildModlogsStep()],
    } as never);
    return;
  }
}

// ─── Channel select handler ───────────────────────────────────────────────────

export async function handleWizardChannelSelect(interaction: ChannelSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) return;
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: `${E.cross} Admins only.`, ephemeral: true });
    return;
  }

  const k = key(interaction.guild.id, interaction.user.id);
  const state: WizardState = sessions.get(k) ?? {};
  const channelId = interaction.values[0];
  if (!channelId) return;

  if (interaction.customId === "wizard:sel:modlogs") {
    state.modlogsChannelId = channelId;
    sessions.set(k, state);
    await saveModLogsChannel(interaction.guild.id, channelId);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [buildPermissionsStep()],
    } as never);
    return;
  }
}
