const {
  drawSingle,
  drawMulti,
  isPickup,
  selectAnimation,
  selectResultImage,
} = require('../src/utils/gachaLogic');

describe('ガチャロジック（seed渡し対応）', () => {
  describe('isPickup - ピックアップ判定', () => {
    test('小さい値ならtrueになる', () => {
      expect(isPickup(0.1)).toBe(true);
    });

    test('大きい値ならfalseになる', () => {
      expect(isPickup(0.99)).toBe(false);
    });
  });

  describe('drawSingle - 1回引き', () => {
    test('seed省略でも結果オブジェクトを返す', () => {
      const result = drawSingle();
      expect(result).toHaveProperty('rarity');
      expect(result).toHaveProperty('isPickup');
      expect(['silver', 'gold', 'rainbow']).toContain(result.rarity);
      expect(typeof result.isPickup).toBe('boolean');
    });

    test('同じseedなら結果が再現される', () => {
      expect(drawSingle(12345)).toEqual(drawSingle(12345));
    });

    test('異なるseedでも返り値の形式は正しい', () => {
      const a = drawSingle(1);
      const b = drawSingle(2);
      [a, b].forEach(r => {
        expect(['silver', 'gold', 'rainbow']).toContain(r.rarity);
        expect(typeof r.isPickup).toBe('boolean');
      });
    });

    test('虹以外では isPickup が true にならない', () => {
      // 複数seedで検証（1回の結果に依存しないように）
      for (let i = 0; i < 1000; i++) {
        const result = drawSingle(500000 + i * 10000);

        if (result.rarity !== 'rainbow') {
          expect(result.isPickup).toBe(false);
        }
      }
    });
  });

  describe('drawMulti - 10連引き', () => {
    test('seed省略でも10個の結果を返す', () => {
      const results = drawMulti();
      expect(results).toHaveLength(10);
    });

    test('各結果が正しい形式を持つ', () => {
      const results = drawMulti(999);
      results.forEach((result) => {
        expect(result).toHaveProperty('rarity');
        expect(result).toHaveProperty('isPickup');
        expect(['silver', 'gold', 'rainbow']).toContain(result.rarity);
        expect(typeof result.isPickup).toBe('boolean');
      });
    });

    test('同じseedなら10連結果が再現される', () => {
      expect(drawMulti(777)).toEqual(drawMulti(777));
    });
  });

  describe('drawMulti - 10枠目保証', () => {
    test('10枠目が必ず金以上（複数seedで確認）', () => {
      for (let i = 0; i < 200; i++) {
        const results = drawMulti(1000 + i);
        const tenth = results[9];
        expect(['gold', 'rainbow']).toContain(tenth.rarity);
      }
    });

    test('1～9枠目には銀が含まれる可能性がある（複数seedで確認）', () => {
      let hasSilverInFirst9 = false;

      for (let i = 0; i < 400; i++) {
        const results = drawMulti(2000 + i);
        if (results.slice(0, 9).some(r => r.rarity === 'silver')) {
          hasSilverInFirst9 = true;
          break;
        }
      }

      expect(hasSilverInFirst9).toBe(true);
    });
  });

  describe('drawSingle - 分布のざっくり検査（フレークしない）', () => {
    /**
     * drawSingle(seed) は毎回 seedFunc(seed) の「最初の乱数」を使う。
     * seed が小さいと初回乱数が低い方に寄りやすいので、seed を大きく散らして偏りを回避する。
     */
    test('複数seedで回したとき、レア度が偏りすぎない', () => {
      const iterations = 20000;
      const counts = { silver: 0, gold: 0, rainbow: 0, pickup: 0 };

      for (let i = 0; i < iterations; i++) {
        // 小さいseedを避けて広い範囲に散らす（安全整数範囲内）
        const seed = 123456789 + i * 100000; // 約 1.2e8 〜 2.1e9
        const r = drawSingle(seed);

        counts[r.rarity]++;
        if (r.isPickup) counts.pickup++;
      }

      const silverRate = counts.silver / iterations;
      const goldRate = counts.gold / iterations;
      const rainbowRate = counts.rainbow / iterations;
      const pickupRate = counts.pickup / iterations;

      // 広めのレンジで “明らかにおかしい” を検出（フレーク回避）
      expect(silverRate).toBeGreaterThan(0.60);
      expect(silverRate).toBeLessThan(0.90);

      expect(goldRate).toBeGreaterThan(0.08);
      expect(goldRate).toBeLessThan(0.30);

      expect(rainbowRate).toBeGreaterThan(0.005);
      expect(rainbowRate).toBeLessThan(0.08);

      // 現仕様：ピックアップは虹のときだけtrue
      expect(pickupRate).toBeLessThanOrEqual(rainbowRate);
      expect(pickupRate).toBeLessThan(0.03);
    });
  });

  describe('selectAnimation - 演出選択', () => {
    test('虹が含まれる場合はguaranteed', () => {
      const results = [
        { rarity: 'silver', isPickup: false },
        { rarity: 'gold', isPickup: false },
        { rarity: 'rainbow', isPickup: false },
      ];
      expect(selectAnimation(results)).toBe('guaranteed');
    });

    test('ピックアップが含まれる場合はguaranteed', () => {
      const results = [
        { rarity: 'silver', isPickup: false },
        { rarity: 'rainbow', isPickup: true },
      ];
      expect(selectAnimation(results)).toBe('guaranteed');
    });

    test('虹なしの場合はnormal', () => {
      const results = [
        { rarity: 'silver', isPickup: false },
        { rarity: 'gold', isPickup: false },
        { rarity: 'silver', isPickup: false },
      ];
      expect(selectAnimation(results)).toBe('normal');
    });
  });

  describe('selectResultImage - 結果画像選択', () => {
    test('ピックアップはpickup', () => {
      expect(selectResultImage('rainbow', true)).toBe('pickup');
    });

    test('虹（非ピックアップ）はrainbow', () => {
      expect(selectResultImage('rainbow', false)).toBe('rainbow');
    });

    test('金はgold', () => {
      expect(selectResultImage('gold', false)).toBe('gold');
    });

    test('銀はsilver', () => {
      expect(selectResultImage('silver', false)).toBe('silver');
    });
  });
});
