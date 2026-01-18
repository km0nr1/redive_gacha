const sharp = require('sharp');
const path = require('path');

// アセットのベースパス
const ASSETS_PATH = path.join(__dirname, '../../assets/gacha');

// 画像サイズ定数
const IMAGE_WIDTH = 48;
const IMAGE_HEIGHT = 64;

// グリッド設定（10連用）
const GRID_COLS = 5;
const GRID_ROWS = 2;

/**
 * レア度とピックアップ状態から画像ファイルパスを取得
 * @param {string} rarity - レア度
 * @param {boolean} isPickup - ピックアップかどうか
 * @returns {string} 画像ファイルパス
 */
function getResultImagePath(rarity, isPickup) {
    if (isPickup) {
        return path.join(ASSETS_PATH, 'results', 'pickup.avif');
    }
    return path.join(ASSETS_PATH, 'results', `${rarity}.avif`);
}

/**
 * 演出アニメーションのパスを取得
 * @param {'normal' | 'guaranteed'} type - 演出タイプ
 * @returns {string} アニメーションファイルパス
 */
function getAnimationPath(type) {
    return path.join(ASSETS_PATH, 'animations', `${type}.avif`);
}

/**
 * ガチャ結果画像を生成
 * @param {Array<{ rarity: string, isPickup: boolean }>} results - ガチャ結果配列
 * @returns {Promise<Buffer>} 生成された画像のBuffer
 */
async function generateResultImage(results) {
    if (results.length === 1) {
        // 1連の場合：単一画像を返す
        const result = results[0];
        const imagePath = getResultImagePath(result.rarity, result.isPickup);
        return await sharp(imagePath).toBuffer();
    }

    // 10連の場合：5列x2行のグリッド画像を生成
    const canvasWidth = IMAGE_WIDTH * GRID_COLS;
    const canvasHeight = IMAGE_HEIGHT * GRID_ROWS;

    // 各画像を読み込んでcomposite用の配列を作成
    const compositeInputs = await Promise.all(
        results.map(async (result, index) => {
            const imagePath = getResultImagePath(result.rarity, result.isPickup);
            const imageBuffer = await sharp(imagePath).toBuffer();

            const col = index % GRID_COLS;
            const row = Math.floor(index / GRID_COLS);

            return {
                input: imageBuffer,
                left: col * IMAGE_WIDTH,
                top: row * IMAGE_HEIGHT,
            };
        })
    );

    // 透明なキャンバスを作成し、画像を配置
    const resultBuffer = await sharp({
        create: {
            width: canvasWidth,
            height: canvasHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite(compositeInputs)
        .png()
        .toBuffer();

    return resultBuffer;
}

/**
 * ガチャ天井画像を生成
 * @returns {Promise<Buffer>} 生成された画像のBuffer
 */
async function generateTenjoImage() {
    const imagePath = path.join(ASSETS_PATH, 'results', 'theEnd.avif');
    return await sharp(imagePath).toBuffer();
}

module.exports = {
    getResultImagePath,
    getAnimationPath,
    generateResultImage,
    generateTenjoImage,
    IMAGE_WIDTH,
    IMAGE_HEIGHT,
};
