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
  PICKUP_MODE,
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
          { name: 'pickup', value: PICKUP_MODE },
          { name: '10', value: 10 },
          { name: '1', value: 1 },
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
      // /gacha pickup
      if (mode === PICKUP_MODE) {
        let sim;
        try {
          sim = runPickupSimulation(seedOpt);
        } catch (e) {
          if (e && (e.code === 'pickup_not_found' || e.message === 'pickup_not_found')) {
            await interaction.editReply({
              content: `1000連（10連×${MAX_PICKUP_10ROLLS}回）してもピックアップが出ませんでした。\n時間をおいてもう一度試してください。`,
            });
            return;
          }
          throw e;
        }

        const animationPath = getAnimationPath('guaranteed');
        await interaction.editReply({
          content: 'ピックアップが出るまで回します…🎞️',
          files: [new AttachmentBuilder(animationPath, { name: 'guaranteed.avif' })],
        });

        await sleep((ANIMATION_MS.guaranteed ?? 6580) + ANIMATION_PADDING_MS);

        const resultImageBuffer = await generateResultImage(sim.results);
        const resultAttachment = new AttachmentBuilder(resultImageBuffer, { name: 'results.png' });
        const embed = buildPickupEmbed(sim.stats, seedOpt);

        await interaction.editReply({
          content: null,
          embeds: [embed],
          files: [resultAttachment],
        });

        return;
      }

      // /gacha 1 or 10
      const results = (mode === 1) ? [drawSingle(seed)] : drawMulti(seed);
      const animationType = selectAnimation(results);
      const animationPath = getAnimationPath(animationType);

      await interaction.editReply({
        content: `演出中…🎞️（${mode === 10 ? '10連' : '1連'}）`,
        files: [new AttachmentBuilder(animationPath, { name: `${animationType}.avif` })],
      });

      await sleep((ANIMATION_MS[animationType] ?? 6500) + ANIMATION_PADDING_MS);

      const resultImageBuffer = await generateResultImage(results);
      const filename = (mode === 10) ? 'results.png' : 'result.avif';
      const resultAttachment = new AttachmentBuilder(resultImageBuffer, { name: filename });

      await interaction.editReply({
        content: summarizeResults(results, seedOpt),
        files: [resultAttachment],
      });
    } catch (error) {
      console.error('ガチャコマンドエラー:', error);
      await interaction.editReply({
        content: 'ガチャの実行中にエラーが発生しました',
      }).catch(() => {});
    }
  },
};
