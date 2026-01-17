// src/services/gachaService.js
const { EmbedBuilder } = require('discord.js');
const { drawMulti, drawPickup } = require('../domain/gacha');
const { MAX_PICKUP_10ROLLS } = require('../config/gachaConfig');

/**
 * ガチャ結果をテキストにまとめる
 * @param {Array<{ rarity: string, isPickup: boolean }>} results - ガチャ結果の配列
 * @param {number | null} seedOpt - シード値（nullの場合は表示しない）
 * @returns {string} フォーマット済みの結果テキスト
 */
function summarizeResults(results, seedOpt) {
  const counts = { silver: 0, gold: 0, rainbow: 0, pickup: 0 };
  for (const r of results) {
    counts[r.rarity]++;
    if (r.isPickup) counts.pickup++;
  }

  const parts = [];
  if (counts.pickup > 0) parts.push(`✨ : **${counts.pickup}枚**`);
  if (counts.rainbow > 0) parts.push(`🌈 : **${counts.rainbow}枚**`);
  if (counts.gold > 0) parts.push(`🟡 : **${counts.gold}枚**`);
  if (counts.silver > 0) parts.push(`⚪ : **${counts.silver}枚**`);

  const seedLine = (seedOpt !== null) ? `\nseed: ${seedOpt}` : '';
  return `**ガチャ結果**\n${parts.join(' / ')}${seedLine}`;
}

/**
 * pickupモード用のDiscord Embedを構築する
 * @param {{ total: number, rainbow: number, pickup: number }} stats - 統計情報（totalは「連」単位）
 * @param {number | null} seedOpt - シード値（nullの場合はfooterに表示しない）
 * @returns {EmbedBuilder} Discord Embed
 */
function buildPickupEmbed(stats, seedOpt) {
  const embed = new EmbedBuilder()
    .setTitle('pickup モード')
    .setDescription('ピックアップが出た10連の結果です')
    .addFields(
      { name: '🎰 総ガチャ回数', value: `**${stats.total}連**`, inline: true },
      { name: '🌈 虹（PU除く）', value: `**${stats.rainbow}枚**`, inline: true },
      { name: '✨ ピックアップ', value: `**${stats.pickup}枚**`, inline: true },
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

  // drawPickup が stats を付与して返す設計なら、それを優先利用（互換性のため）
  const results = drawPickup(seedOpt);
  if (results && typeof results === 'object' && results.stats) {
    return { results, stats: results.stats };
  }

  // stats 付与が無い場合、仕様どおり「最大1000連」で統計を作る
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
  summarizeResults,
  buildPickupEmbed,
  runPickupSimulation,
  selectAnimation,
  selectResultImage,
};
