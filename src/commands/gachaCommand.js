// src/commands/gachaCommand.js
const {
  SlashCommandBuilder,
  AttachmentBuilder,
} = require('discord.js');

const { drawSingle, drawMulti } = require('../domain/gacha');
const { generateResultImage, getAnimationPath } = require('../utils/imageGenerator');
const { sleep, isAdmin } = require('../utils/discord');
const {
  ANIMATION_MS,
  ANIMATION_PADDING_MS,
  GACHA_MODE,
  MAX_PICKUP_10ROLLS,
} = require('../config/gachaConfig');
const {
  summarizeResults,
  buildPickupEmbed,
  runPickupSimulation,
  selectAnimation,
} = require('../services/gachaService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('ガチャを引きます（pickup / 10連 / 1連）')
    .addIntegerOption((option) =>
      option
        .setName('count')
        .setDescription('回数（pickup / 10 / 1）')
        .setRequired(true)
        .addChoices(
          { name: 'pickup', value: GACHA_MODE.pickup },
          { name: '10', value: GACHA_MODE.multi },
          { name: '1', value: GACHA_MODE.single },
        )
    )
    .addIntegerOption((option) =>
      option
        .setName('seed')
        .setDescription('（管理者用）結果再現用seed')
        .setRequired(false)
    ),

  async execute(interaction) {
    const mode = interaction.options.getInteger('count', true);
    const seedOpt = interaction.options.getInteger('seed', false);
    const seed = (seedOpt === null) ? undefined : seedOpt;

    // seed指定は管理者のみ
    if (seedOpt !== null && !isAdmin(interaction)) {
      await interaction.reply({
        content: 'seed オプションは管理者のみ使用できます',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      switch (mode) {
        case GACHA_MODE.pickup: {
          const success = await executePickupMode(interaction, seedOpt);
          if (!success) return;
          break;
        }

        case GACHA_MODE.single: {
          const results = [drawSingle(seed)];
          await executeGachaWithAnimation(interaction, results, '1連', seedOpt);
          break;
        }

        case GACHA_MODE.multi: {
          const results = drawMulti(seed);
          await executeGachaWithAnimation(interaction, results, '10連', seedOpt);
          break;
        }

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      console.error('ガチャコマンドエラー:', error);
      await interaction.editReply({
        content: 'ガチャの実行中にエラーが発生しました',
      }).catch(() => {});
    }
  },
};

/**
 * 1連/10連ガチャのアニメーション付き実行
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {Array<{ rarity: string, isPickup: boolean }>} results
 * @param {string} label - 表示用ラベル（'1連' or '10連'）
 * @param {number | null} seedOpt
 */
async function executeGachaWithAnimation(interaction, results, label, seedOpt) {
  const animationType = selectAnimation(results);
  const animationPath = getAnimationPath(animationType);
  const animationMessage = (animationType === 'guaranteed')
    ? 'おめでとうございます！'
    : '素敵な仲間が増えますよ！';

  await interaction.editReply({
    content: animationMessage,
    files: [new AttachmentBuilder(animationPath, { name: `${animationType}.avif` })],
  });

  await sleep(ANIMATION_MS[animationType] + ANIMATION_PADDING_MS);

  const resultImageBuffer = await generateResultImage(results);
  const filename = (label === '10連') ? 'results.png' : 'result.avif';
  const resultAttachment = new AttachmentBuilder(resultImageBuffer, { name: filename });

  await interaction.editReply({
    content: summarizeResults(results, seedOpt),
    files: [resultAttachment],
  });
}

/**
 * pickupモードの実行（ピックアップが出るまで回す）
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {number | null} seedOpt
 * @returns {Promise<boolean>} 正常終了した場合true、エラーメッセージを表示した場合false
 */
async function executePickupMode(interaction, seedOpt) {
  let sim;
  try {
    sim = runPickupSimulation(seedOpt);
  } catch (e) {
    if (e && (e.code === 'pickup_not_found' || e.message === 'pickup_not_found')) {
      await interaction.editReply({
        content: `1000連してもピックアップが出ませんでした。`,
      });
      return false;
    }
    throw e;
  }

  const animationPath = getAnimationPath('guaranteed');
  await interaction.editReply({
    content: '緑の悪魔祈祷中…🎞️',
    files: [new AttachmentBuilder(animationPath, { name: 'guaranteed.avif' })],
  });

  await sleep(ANIMATION_MS.guaranteed + ANIMATION_PADDING_MS);

  const resultImageBuffer = await generateResultImage(sim.results);
  const resultAttachment = new AttachmentBuilder(resultImageBuffer, { name: 'results.png' });
  const embed = buildPickupEmbed(sim.stats, seedOpt);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    files: [resultAttachment],
  });

  return true;
}
