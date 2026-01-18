// src/services/gachaService.js
const { EmbedBuilder } = require('discord.js');
const { drawMulti } = require('../domain/gacha');
const { MAX_PICKUP_10ROLLS } = require('../config/gachaConfig');

/**
 * ガチャ結果用のDiscord Embedを構築する
 * @param {Array<{ rarity: string, isPickup: boolean }>} results - ガチャ結果の配列
 * @param {string} label - 表示用ラベル（'1連' or '10連'）
 * @param {number | null} seedOpt - シード値（nullの場合はfooterに表示しない）
 * @returns {EmbedBuilder} Discord Embed
 */
function buildResultEmbed(results, label, seedOpt) {
  const counts = { silver: 0, gold: 0, rainbow: 0, pickup: 0 };
  for (const r of results) {
    counts[r.rarity]++;
    if (r.isPickup) counts.pickup++;
  }

  const fields = [];
  if (counts.pickup > 0) fields.push({ name: '✨ PU', value: `**${counts.pickup}枚**`, inline: true });
  if (counts.rainbow > 0) fields.push({ name: '🌈 虹', value: `**${counts.rainbow}枚**`, inline: true });
  if (counts.gold > 0) fields.push({ name: '🟡 金', value: `**${counts.gold}枚**`, inline: true });
  if (counts.silver > 0) fields.push({ name: '⚪ 銀', value: `**${counts.silver}枚**`, inline: true });

  const embed = new EmbedBuilder()
    .setTitle(`ガチャ結果（${label}）`)
    .addFields(fields)
    .setImage('attachment://results.png');

  if (seedOpt !== null) {
    embed.setFooter({ text: `seed: ${seedOpt}` });
  }
  return embed;
}

/**
 * pickupモード用のDiscord Embedを構築する
 * @param {{ total: number, rainbow: number, pickup: number }} stats - 統計情報（totalは「連」単位）
 * @param {number | null} seedOpt - シード値（nullの場合はfooterに表示しない）
 * @returns {EmbedBuilder} Discord Embed
 */
function buildPickupEmbed(stats, seedOpt) {
  const embed = new EmbedBuilder()
    .setTitle('ガチャ結果（pickup）')
    .setDescription('ピックアップが出た10連の結果です')
    .addFields(
      { name: '🎰 総ガチャ回数', value: `**${stats.total}連**`, inline: true },
      { name: '🌈 虹（すり抜け）', value: `**${stats.rainbow}枚**`, inline: true },
      // PUが当たったときのガチャなので意味がない
      // { name: '✨ PU', value: `**${stats.pickup}枚**`, inline: true },
    )
    .setImage('attachment://results.png');

  if (seedOpt !== null) {
    embed.setFooter({ text: `seed: ${seedOpt}` });
  }
  return embed;
}

/**
 * pickupモード天井用のDiscord Embedを構築する
 * @param {{ total: number, rainbow: number, pickup: number }} stats - 統計情報（totalは「連」単位）
 * @param {number | null} seedOpt - シード値（nullの場合はfooterに表示しない）
 * @returns {EmbedBuilder} Discord Embed
 */
function buildTenjoEmbed(stats, seedOpt) {
  const embed = new EmbedBuilder()
    .setTitle('ガチャ結果（pickup）')
    .setDescription('🚨緊急事態です🚨\nピックアップが出ませんでした。')
    .addFields(
      { name: '🎰 総ガチャ回数', value: `**${stats.total}連**`, inline: true },
      { name: '🌈 虹（すり抜け）', value: `**${stats.rainbow}枚**`, inline: true },
    )
    .setImage('attachment://results.png');

  if (seedOpt !== null) {
    embed.setFooter({ text: `seed: ${seedOpt}` });
  }
  return embed;
}

/**
 * pickupモードを実行し、ピックアップが出た10連の結果と統計を返す
 * @param {number | null} seedOpt - シード値（nullの場合はランダム）
 * @returns {{ results: Array<{ rarity: string, isPickup: boolean }>, stats: { total: number, rainbow: number, pickup: number } }}
 * @throws {Error} 最大試行回数内にピックアップが出なかった場合（code: 'pickup_not_found'）
 */
function runPickupSimulation(seedOpt) {
  const stats = { total: 0, rainbow: 0, pickup: 0 };

  // seed指定の場合は「seed + attempts10」で 10連ごとに seed を変える（ユーザ要件）
  for (let attempts10 = 1; attempts10 <= MAX_PICKUP_10ROLLS; attempts10++) {
    const seedForThis = (seedOpt === null) ? undefined : (seedOpt + attempts10);
    const batch = drawMulti(seedForThis);

    for (const r of batch) {
      if (r.isPickup) stats.pickup++;
      else if (r.rarity === 'rainbow') stats.rainbow++;
    }
    stats.total += 10;

    if (batch.some((r) => r.isPickup)) {
      return { results: batch, stats };
    }
  }

  const err = new Error('pickup_not_found');
  err.code = 'pickup_not_found';
  err.stats = stats;
  throw err;
}

/**
 * 演出選択
 * @param {Array<{ rarity: string, isPickup: boolean }>} results
 * @returns {'guaranteed' | 'normal'}
 */
function selectAnimation(results) {
  const hasRainbowOrPickup = results.some(r => r.rarity === 'rainbow' || r.isPickup);
  return hasRainbowOrPickup ? 'guaranteed' : 'normal';
}

/**
 * 結果画像選択（優先度: ピックアップ > 虹 > 金 > 銀）
 * @param {string} rarity
 * @param {boolean} isPickupFlag
 * @returns {'pickup' | 'rainbow' | 'gold' | 'silver'}
 */
function selectResultImage(rarity, isPickupFlag) {
  if (isPickupFlag) return 'pickup';
  return rarity;
}

module.exports = {
  buildResultEmbed,
  buildPickupEmbed,
  buildTenjoEmbed,
  runPickupSimulation,
  selectAnimation,
  selectResultImage,
};
