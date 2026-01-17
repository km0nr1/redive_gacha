const Aimless = require('aimless.js');

// レア度の確率定数
const RARITY_RATES = {
  SILVER: 0.79,
  GOLD: 0.18,
  RAINBOW: 0.03,
  PICKUP: 0.007,
};

// ピックアップ確率（虹の中での割合: 0.7% / 3% ≈ 0.233）
const PICKUP_RATE = RARITY_RATES.PICKUP / RARITY_RATES.RAINBOW;

// 10連の10枠目用（金以上確定）
const GUARANTEED_RATES = {
  GOLD: 0.97,
  RAINBOW: 0.03,
};

const RARITY_OPTIONS = ['silver', 'gold', 'rainbow'];
const RARITY_WEIGHTS = [RARITY_RATES.SILVER, RARITY_RATES.GOLD, RARITY_RATES.RAINBOW];

const GUARANTEED_OPTIONS = ['gold', 'rainbow'];
const GUARANTEED_WEIGHTS = [GUARANTEED_RATES.GOLD, GUARANTEED_RATES.RAINBOW];

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
 * 1回引き（seedだけ受け取る。省略ならDate.now）
 * @param {number | undefined} seed
 * @returns {{ rarity: string, isPickup: boolean }}
 */
function drawSingle(seed) {
  const rng = createRng(seed);
  return drawSingleWithRng(rng);
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
 * 10連（seedだけ受け取る。省略ならDate.now）
 * 10枠目は金以上確定
 * @param {number | undefined} seed
 * @returns {Array<{ rarity: string, isPickup: boolean }>}
 */
function drawMulti(seed) {
  const rng = createRng(seed);

  const results = [];
  for (let i = 0; i < 9; i++) {
    results.push(drawSingleWithRng(rng));
  }
  results.push(drawGuaranteedWithRng(rng));

  return results;
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
  RARITY_RATES,
  PICKUP_RATE,
  GUARANTEED_RATES,
  isPickup,
  drawSingle,
  drawMulti,
  selectAnimation,
  selectResultImage,
};
