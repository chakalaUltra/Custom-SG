import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { getRankRoles, saveRankRoles, type RankRolesConfig } from "../store.js";
import { buildActionContainer } from "../components.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "rank-roles";

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Configure the roles assigned for each rank tier")
  .addSubcommand((sub) =>
    sub
      .setName("stage")
      .setDescription("Set the role for a rank stage (1–5)")
      .addIntegerOption((opt) =>
        opt
          .setName("stage")
          .setDescription("Stage number (1–5)")
          .setRequired(true)
          .addChoices(
            { name: "Stage 1", value: 1 },
            { name: "Stage 2", value: 2 },
            { name: "Stage 3", value: 3 },
            { name: "Stage 4", value: 4 },
            { name: "Stage 5", value: 5 },
          ),
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role to assign for this stage").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("midstage")
      .setDescription("Set the role for a midstage level")
      .addStringOption((opt) =>
        opt
          .setName("level")
          .setDescription("Midstage level")
          .setRequired(true)
          .addChoices(
            { name: "High", value: "High" },
            { name: "Mid", value: "Mid" },
            { name: "Low", value: "Low" },
          ),
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role to assign for this midstage").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("extrastage")
      .setDescription("Set the role for an extrastage strength")
      .addStringOption((opt) =>
        opt
          .setName("strength")
          .setDescription("Extrastage strength")
          .setRequired(true)
          .addChoices(
            { name: "Strong", value: "Strong" },
            { name: "Stable", value: "Stable" },
            { name: "Weak", value: "Weak" },
          ),
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role to assign for this extrastage").setRequired(true),
      ),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: `${E.cross} Server only.`, ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  const existing = getRankRoles(guildId) ?? {
    stages: {},
    midstages: {},
    extrastages: {},
  } satisfies RankRolesConfig;

  if (sub === "stage") {
    const stage = interaction.options.getInteger("stage", true);
    const role = interaction.options.getRole("role", true);
    existing.stages[String(stage)] = role.id;
    await saveRankRoles(guildId, existing);
    await interaction.reply(
      buildActionContainer(
        `${E.sliders} Rank Roles Updated`,
        [`Stage **${stage}** is now linked to <@&${role.id}>.`],
        `Set by ${interaction.user.tag}`,
      ),
    );
  } else if (sub === "midstage") {
    const level = interaction.options.getString("level", true);
    const role = interaction.options.getRole("role", true);
    existing.midstages[level] = role.id;
    await saveRankRoles(guildId, existing);
    await interaction.reply(
      buildActionContainer(
        `${E.sliders} Rank Roles Updated`,
        [`Midstage **${level}** is now linked to <@&${role.id}>.`],
        `Set by ${interaction.user.tag}`,
      ),
    );
  } else if (sub === "extrastage") {
    const strength = interaction.options.getString("strength", true);
    const role = interaction.options.getRole("role", true);
    existing.extrastages[strength] = role.id;
    await saveRankRoles(guildId, existing);
    await interaction.reply(
      buildActionContainer(
        `${E.sliders} Rank Roles Updated`,
        [`Extrastage **${strength}** is now linked to <@&${role.id}>.`],
        `Set by ${interaction.user.tag}`,
      ),
    );
  }
}
