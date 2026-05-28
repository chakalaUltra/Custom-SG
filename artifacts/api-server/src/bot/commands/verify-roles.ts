import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { saveVerifyRoles } from "../store.js";
import { buildActionContainer } from "../components.js";
import { E } from "../emojis.js";

export const data = new SlashCommandBuilder()
  .setName("verify-roles")
  .setDescription("Set up the verification roles used by /verify and /mainer")
  .addRoleOption((opt) =>
    opt
      .setName("verified")
      .setDescription("Role given to verified members")
      .setRequired(true),
  )
  .addRoleOption((opt) =>
    opt
      .setName("unverified")
      .setDescription("Role removed on verification")
      .setRequired(true),
  )
  .addRoleOption((opt) =>
    opt
      .setName("mainer")
      .setDescription("Role given to certified mainstay members")
      .setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: `${E.cross} This command can only be used in a server.`,
      ephemeral: true,
    });
    return;
  }

  const verified = interaction.options.getRole("verified", true);
  const unverified = interaction.options.getRole("unverified", true);
  const mainer = interaction.options.getRole("mainer", true);

  await saveVerifyRoles(interaction.guild.id, {
    verifiedRoleId: verified.id,
    unverifiedRoleId: unverified.id,
    mainerRoleId: mainer.id,
  });

  const payload = buildActionContainer(
    `${E.sliders} Verification Roles Configured`,
    [
      `Verified: <@&${verified.id}> · Unverified: <@&${unverified.id}> · Mainer: <@&${mainer.id}>`,
    ],
    `Set by ${interaction.user.tag}`,
  );

  await interaction.reply(payload);
}
