require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`コマンド読み込み: ${command.data.name}`);
    } else {
        console.warn(`警告: ${filePath} に data または execute がありません`);
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`${commands.length} 個のコマンドを登録中...`);

        // グローバルコマンドとして登録
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`${data.length} 個のコマンドを正常に登録しました`);
    } catch (error) {
        console.error('コマンド登録エラー:', error);
    }
})();
