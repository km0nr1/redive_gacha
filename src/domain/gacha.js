// src/domain/gacha.js
const Aimless = require('aimless.js');

const {
  PICKUP_RATE,
  RARITY_OPTIONS,
  RARITY_WEIGHTS,
  GUARANTEED_OPTIONS,
  GUARANTEED_WEIGHTS,
  MAX_PICKUP_10ROLLS,
} = require('../config/gachaConfig');

/**
 * seedからrngを作る（未指定なら Date.now() + Math.random）
 * @param {number | undefined} seed
 * @returns {Function} rng engine
 */
function createRng(seed) {
  const actualSeed =
    (typeof seed === 'number' && Number.isFinite(seed))
      ? seed
      : Date.now() + Math.floor(Math.random() * 1e9);

  return Aimless.seedFunc(actualSeed);
}

/**
 * 虹の中でピックアップかどうか
 * @param {number} randomValue - 0～1
 * @returns {boolean}
 */
function isPickup(randomValue) {
  return randomValue < PICKUP_RATE;
}

/**
 * rngを使って1回引き（内部用）
 * @param {Function} rng
 * @returns {{ rarity: string, isPickup: boolean }}
 */
function drawSingleWithRng(rng) {
  const weightedFunc = Aimless.weightWithEngine(rng);
  const rarity = weightedFunc(RARITY_OPTIONS, RARITY_WEIGHTS);

  let isPickupResult = false;
  if (rarity === 'rainbow') {
    const pickupRandom = Aimless.floatRangeWithEngine(rng)(0, 1);
    isPickupResult = isPickup(pickupRandom);
  }
  return { rarity, isPickup: isPickupResult };
}

/**
 * 10枠目の確定抽選（内部用）
 * @param {Function} rng
 * @returns {{ rarity: string, isPickup: boolean }}
 */
function drawGuaranteedWithRng(rng) {
  const weightedFunc = Aimless.weightWithEngine(rng);
  const rarity = weightedFunc(GUARANTEED_OPTIONS, GUARANTEED_WEIGHTS);

  let isPickupResult = false;
  if (rarity === 'rainbow') {
    const pickupRandom = Aimless.floatRangeWithEngine(rng)(0, 1);
    isPickupResult = isPickup(pickupRandom);
  }
  return { rarity, isPickup: isPickupResult };
}

/**
 * rngを使って10回引き（内部用）
 * 10枠目は金以上確定
 * @param {Function} rng
 * @returns {Array<{ rarity: string, isPickup: boolean }>}
 */
function drawMultiWithRng(rng) {
  const results = [];
  for (let i = 0; i < 9; i++) {
    results.push(drawSingleWithRng(rng));
  }
  results.push(drawGuaranteedWithRng(rng));
  return results;
}

/**
 * 1回引き（seedだけ受け取る。省略ならDate.now）
 * @param {number | undefined} seed
 * @returns {{ rarity: string, isPickup: boolean }}
 */
function drawSingle(seed) {
  const rng = createRng(seed);
  return drawSingleWithRng(rng);
}

/**
 * 10連（seedだけ受け取る。省略ならDate.now）
 * 10枠目は金以上確定
 * @param {number | undefined} seed
 * @returns {Array<{ rarity: string, isPickup: boolean }>}
 */
function drawMulti(seed) {
  const rng = createRng(seed);
  return drawMultiWithRng(rng);
}

/**
 * ピックアップが出るまで10連を回す
 * 10枠目は金以上確定
 * @param {number | undefined} seed
 * @returns {Array<{ rarity: string, isPickup: boolean }>}
 * @throws {Error} ピックアップが出なかった場合
 */
function drawPickup(seed) {
  const rng = createRng(seed);

  for (let i = 0; i < MAX_PICKUP_10ROLLS; i++) {
    const results = drawMultiWithRng(rng);

    if (results.some(r => r.isPickup)) {
      return results;
    }
  }

  throw new Error('pickup_not_found');
}

module.exports = {
  isPickup,
  drawSingle,
  drawMulti,
  drawPickup,
};
