import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { getRankRoles, saveUserRank, saveModAction, generateId } from "../store.js";
import { buildActionContainer } from "../components.js";
import { canRunCommand } from "../permissions.js";
import { dispatchModLog } from "../modlog.js";
import { E } from "../emojis.js";

export const COMMAND_NAME = "rank";

const VALID_MIDSTAGES = ["High", "Mid", "Low"] as const;
const VALID_EXTRASTAGES = ["Strong", "Stable", "Weak"] as const;

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Assign a rank to a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to rank").setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("stage")
      .setDescription("Rank stage (1–5)")
      .setRequired(true)
      .addChoices(
        { name: "Stage 1", value: 1 },
        { name: "Stage 2", value: 2 },
        { name: "Stage 3", value: 3 },
        { name: "Stage 4", value: 4 },
        { name: "Stage 5", value: 5 },
      ),
  )
  .addStringOption((opt) =>
    opt
      .setName("midstage")
      .setDescription("Midstage level")
      .setRequired(true)
      .addChoices(
        { name: "High", value: "High" },
        { name: "Mid", value: "Mid" },
        { name: "Low", value: "Low" },
      ),
  )
  .addStringOption((opt) =>
    opt
      .setName("extrastage")
      .setDescription("Extrastage strength")
      .setRequired(true)
      .addChoices(
        { name: "Strong", value: "Strong" },
        { name: "Stable", value: "Stable" },
        { name: "Weak", value: "Weak" },
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
  const executor = interaction.member as GuildMember;
  if (!canRunCommand(executor, COMMAND_NAME)) {
    await interaction.reply({ content: `${E.cross} You do not have permission to use this command.`, ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const stage = interaction.options.getInteger("stage", true);
  const midstage = interaction.options.getString("midstage", true);
  const extrastage = interaction.options.getString("extrastage", true);

  await interaction.deferReply();

  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) {
    await interaction.editReply({ content: `${E.cross} Could not find that user in this server.` });
    return;
  }

  await runRank(interaction.guild.id, target, executor, stage, midstage, extrastage, async (p) => {
    await interaction.editReply(p as never);
  });
}

export async function runRank(
  guildId: string,
  target: GuildMember,
  executor: GuildMember,
  stage: number,
  midstage: string,
  extrastage: string,
  replyFn: (payload: object) => Promise<void>,
): Promise<void> {
  const rankConfig = getRankRoles(guildId);
  if (!rankConfig) {
    await replyFn({ content: `${E.cross} Rank roles are not configured yet. Use \`/rank-roles\` first.` });
    return;
  }

  const allStageRoles = Object.values(rankConfig.stages).filter(Boolean) as string[];
  const allMidstageRoles = Object.values(rankConfig.midstages).filter(Boolean) as string[];
  const allExtrastageRoles = Object.values(rankConfig.extrastages).filter(Boolean) as string[];

  const newStageRole = rankConfig.stages[String(stage)];
  const newMidstageRole = rankConfig.midstages[midstage];
  const newExtrastageRole = rankConfig.extrastages[extrastage];

  const rolesToAdd: string[] = [];
  const rolesToRemove: string[] = [];

  for (const rId of allStageRoles) {
    if (rId === newStageRole) rolesToAdd.push(rId);
    else rolesToRemove.push(rId);
  }
  for (const rId of allMidstageRoles) {
    if (rId === newMidstageRole) rolesToAdd.push(rId);
    else rolesToRemove.push(rId);
  }
  for (const rId of allExtrastageRoles) {
    if (rId === newExtrastageRole) rolesToAdd.push(rId);
    else rolesToRemove.push(rId);
  }

  try {
    if (rolesToRemove.length > 0) {
      await target.roles.remove(rolesToRemove.filter((r) => target.roles.cache.has(r)));
    }
    if (rolesToAdd.length > 0) {
      await target.roles.add(rolesToAdd);
    }
  } catch {
    await replyFn({ content: `${E.cross} Failed to modify roles. Ensure the bot has **Manage Roles** and its role is above the rank roles.` });
    return;
  }

  await saveUserRank(guildId, target.id, { stage, midstage, extrastage });

  await saveModAction(guildId, {
    id: generateId(),
    type: "rank",
    moderatorId: executor.id,
    moderatorTag: executor.user.tag,
    targetId: target.id,
    targetTag: target.user.tag,
    reason: `Stage ${stage} ${midstage} ${extrastage}`,
    timestamp: Date.now(),
  });

  await dispatchModLog(guildId, "rank", target.user.tag, target.id, executor.user.tag, {
    extra: `Stage **${stage}** · **${midstage}** · **${extrastage}**`,
  });

  const missingRoles: string[] = [];
  if (!newStageRole) missingRoles.push(`Stage ${stage}`);
  if (!newMidstageRole) missingRoles.push(midstage);
  if (!newExtrastageRole) missingRoles.push(extrastage);

  const lines = [
    `**${target.user.tag}** has been ranked: Stage **${stage}** · **${midstage}** · **${extrastage}**`,
  ];
  if (missingRoles.length > 0) {
    lines.push(`${E.info} No role configured for: ${missingRoles.join(", ")} — use \`/rank-roles\` to set them up.`);
  }

  await replyFn(
    buildActionContainer(
      `${E.chart} Rank Assigned`,
      lines,
      `By ${executor.user.tag}`,
    ),
  );
}

export function parseRankArgs(args: string[]): { stage: number; midstage: string; extrastage: string } | null {
  const stage = parseInt(args[0] ?? "", 10);
  if (isNaN(stage) || stage < 1 || stage > 5) return null;

  const midstage = args[1];
  if (!midstage || !(VALID_MIDSTAGES as readonly string[]).includes(midstage)) return null;

  const extrastage = args[2];
  if (!extrastage || !(VALID_EXTRASTAGES as readonly string[]).includes(extrastage)) return null;

  return { stage, midstage, extrastage };
}
