// src/config/gachaConfig.js

// === ガチャ確率 ===
const RARITY_RATES = {
  SILVER: 0.79,
  GOLD: 0.18,
  RAINBOW: 0.03,
  PICKUP: 0.007,
};

// 10連の10枠目用（金以上確定）
const GUARANTEED_RATES = {
  GOLD: 0.97,
  RAINBOW: 0.03,
};

// ピックアップ確率（虹の中での割合: 0.7% / 3% ≈ 0.233）
const PICKUP_RATE = RARITY_RATES.PICKUP / RARITY_RATES.RAINBOW;

// 重み付け抽選用
const RARITY_OPTIONS = ['silver', 'gold', 'rainbow'];
const RARITY_WEIGHTS = [RARITY_RATES.SILVER, RARITY_RATES.GOLD, RARITY_RATES.RAINBOW];

const GUARANTEED_OPTIONS = ['gold', 'rainbow'];
const GUARANTEED_WEIGHTS = [GUARANTEED_RATES.GOLD, GUARANTEED_RATES.RAINBOW];

// === 制限値 ===
// 安全装置：最大1000連（= 100回の10連）
const MAX_PICKUP_10ROLLS = 100;

// === アニメーション ===
// ffprobe結果（ms）
const ANIMATION_MS = {
  normal: 6400,
  guaranteed: 6400,
};
const ANIMATION_PADDING_MS = 0;

// === Discord ===
// pickup モード識別子（Discord choices用）
const PICKUP_MODE = 8888;

module.exports = {
  // 確率
  RARITY_RATES,
  PICKUP_RATE,
  GUARANTEED_RATES,
  RARITY_OPTIONS,
  RARITY_WEIGHTS,
  GUARANTEED_OPTIONS,
  GUARANTEED_WEIGHTS,
  // 制限値
  MAX_PICKUP_10ROLLS,
  // アニメーション
  ANIMATION_MS,
  ANIMATION_PADDING_MS,
  // Discord
  PICKUP_MODE,
};
