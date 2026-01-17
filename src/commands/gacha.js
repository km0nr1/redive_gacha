const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { drawSingle, drawMulti, selectAnimation } = require('../utils/gachaLogic');
const { generateResultImage, getAnimationPath } = require('../utils/imageGenerator');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gacha')
        .setDescription('ガチャを引く')
        .addIntegerOption(option =>
            option
                .setName('count')
                .setDescription('引く回数')
                .setRequired(true)
                .addChoices(
                    { name: '1連', value: 1 },
                    { name: '10連', value: 10 }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('seed')
                .setDescription('シード値（デバッグ用）')
                .setRequired(false)
        ),

    async execute(interaction) {
        // 遅延応答
        await interaction.deferReply();

        try {
            const count = interaction.options.getInteger('count');
            const seed = interaction.options.getInteger('seed') ?? undefined;

            // ガチャ実施
            let results;
            if (count === 1) {
                results = [drawSingle(seed)];
            } else {
                results = drawMulti(seed);
            }

            // 演出タイプを決定
            const animationType = selectAnimation(results);
            const animationPath = getAnimationPath(animationType);

            // 演出AVIF送信
            const animationBuffer = fs.readFileSync(animationPath);
            const animationAttachment = new AttachmentBuilder(animationBuffer, {
                name: `${animationType}.avif`,
            });

            await interaction.editReply({
                files: [animationAttachment],
            });

            // 結果画像生成
            const resultImageBuffer = await generateResultImage(results);
            const resultAttachment = new AttachmentBuilder(resultImageBuffer, {
                name: 'result.png',
            });

            // 結果テキスト生成
            const resultText = generateResultText(results);

            // 結果画像送信
            await interaction.followUp({
                content: resultText,
                files: [resultAttachment],
            });
        } catch (error) {
            console.error('ガチャコマンドエラー:', error);
            await interaction.editReply({
                content: 'ガチャの実行中にエラーが発生しました。',
            });
        }
    },
};

/**
 * 結果テキストを生成
 * @param {Array<{ rarity: string, isPickup: boolean }>} results
 * @returns {string}
 */
function generateResultText(results) {
    const counts = {
        silver: 0,
        gold: 0,
        rainbow: 0,
        pickup: 0,
    };

    results.forEach(result => {
        counts[result.rarity]++;
        if (result.isPickup) {
            counts.pickup++;
        }
    });

    const parts = [];
    if (counts.pickup > 0) parts.push(`ピックアップ: ${counts.pickup}`);
    if (counts.rainbow > 0) parts.push(`虹: ${counts.rainbow}`);
    if (counts.gold > 0) parts.push(`金: ${counts.gold}`);
    if (counts.silver > 0) parts.push(`銀: ${counts.silver}`);

    return `**ガチャ結果**\n${parts.join(' / ')}`;
}
