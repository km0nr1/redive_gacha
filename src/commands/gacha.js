// src/commands/gacha.js
const {
  SlashCommandBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const { drawSingle, drawMulti, selectAnimation } = require('../utils/gachaLogic');
const { generateResultImage, getAnimationPath } = require('../utils/imageGenerator');

const ANIMATION_MS = {
  normal: 6400,
  guaranteed: 6400,
};

// Discord側の表示遅延などを見込んだ余裕
const ANIMATION_PADDING_MS = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isAdmin(interaction) {
  // DMなどで memberPermissions が無い場合は false
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('ガチャを引く')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('引く回数（1連 / 10連）')
        .setRequired(true)
        .addChoices(
          { name: '1', value: 1 },
          { name: '10', value: 10 },
        )
    )
    .addIntegerOption(option =>
      option
        .setName('seed')
        .setDescription('シード値（管理者用・デバッグ）')
        .setRequired(false)
    ),

  async execute(interaction) {
    // 入力取得（seed制限をdefer前に判定したい）
    const count = interaction.options.getInteger('count', true);
    const seedOpt = interaction.options.getInteger('seed', false); // number | null
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
      // 1) ガチャ実施
      const results = (count === 10) ? drawMulti(seed) : [drawSingle(seed)];

      // 2) 演出タイプを決定して送信（editReply）
      const animationType = selectAnimation(results); // 'normal' | 'guaranteed'
      const animationPath = getAnimationPath(animationType);

      await interaction.editReply({
        content: `緑の悪魔祈祷中…（${count === 10 ? '10連' : '1連'}）`,
        files: [new AttachmentBuilder(animationPath, { name: `${animationType}.avif` })],
      });

      // アニメが終わるまで待つ
      const waitMs = (ANIMATION_MS[animationType] ?? 6500) + ANIMATION_PADDING_MS;
      await sleep(waitMs);

      // 3) 結果画像生成
      const resultImageBuffer = await generateResultImage(results);
      const filename = (count === 10) ? 'results.png' : 'result.avif';
      const resultAttachment = new AttachmentBuilder(resultImageBuffer, { name: filename });

      // 結果テキスト生成（seed指定時のみ表示）
      const resultText = generateResultText(results, seedOpt);

      // 4) 同じ発言を結果に置換（ループ対策）
      await interaction.editReply({
        content: resultText,
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

/**
 * 結果テキストを生成
 * @param {Array<{ rarity: string, isPickup: boolean }>} results
 * @param {number|null} seedOpt
 * @returns {string}
 */
function generateResultText(results, seedOpt) {
  const counts = { silver: 0, gold: 0, rainbow: 0, pickup: 0 };

  for (const r of results) {
    counts[r.rarity]++;
    if (r.isPickup) counts.pickup++;
  }

  const parts = [];
  if (counts.pickup > 0) parts.push(`ピックアップ: ${counts.pickup}`);
  if (counts.rainbow > 0) parts.push(`虹: ${counts.rainbow}`);
  if (counts.gold > 0) parts.push(`金: ${counts.gold}`);
  if (counts.silver > 0) parts.push(`銀: ${counts.silver}`);

  const seedLine = (seedOpt !== null) ? `\nseed: ${seedOpt}` : '';
  return `**ガチャ結果**\n${parts.join(' / ')}${seedLine}`;
}
