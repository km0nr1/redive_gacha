# redive_gacha

Discord 上で動作する、ガチャ機能付き BOT です。  
1連・10連ガチャ、演出画像、結果画像（10連は5×2グリッド）に対応しています。

---

## 概要
- スラッシュコマンド `/gacha` でガチャを実行
- 1連 / 10連に対応
- 虹またはピックアップが含まれる場合は特別演出を表示
- ガチャ結果は画像で表示（10連は5列×2行）
- seed 指定による結果再現（管理者のみ）

---

## 機能
- `/gacha 1`
  - 1連ガチャ
  - 演出画像 → 結果画像（1枚）
- `/gacha 10`
  - 10連ガチャ
  - 10枠目は金以上確定
  - 演出画像 → 結果画像（5×2グリッド）
- ピックアップ仕様
  - ピックアップは虹レアリティ時のみ発生
- デバッグ用 seed 指定（管理者のみ）

---

## ガチャ仕様

### レアリティ確率（通常）
| レアリティ | 確率 |
|-----------|------|
| 銀 | 79% |
| 金 | 18% |
| 虹 | 3% |

### 10連ガチャ
- 10枠目は **金以上確定**
- 1～9枠目は通常確率

### ピックアップ
- 虹レアリティ時のみ判定
- 虹のうち約 23.3% がピックアップ

---

## セットアップ手順

### 必要条件
- Node.js 18 以上
- Discord Bot アカウント
- Bot に以下の権限が付与されていること
  - applications.commands
  - メッセージ送信
  - ファイル添付

---

### インストール
```bash
git clone <repository-url>
cd redive_gacha
npm install
```

---

### 設定
プロジェクト直下に `.env` を作成し、以下を設定してください。

```env
DISCORD_TOKEN=xxxxxxxxxxxxxxxx
CLIENT_ID=xxxxxxxxxxxxxxxx
```

- `DISCORD_TOKEN` : Discord Bot のトークン
- `CLIENT_ID` : Bot の Application ID

※ `.env` は Git 管理対象外です。

---

### スラッシュコマンド登録
初回、またはコマンド定義を変更した場合に実行します。

```bash
node src/deploy-commands.js
```

---

### 起動方法
```bash
node src/index.js
```

（開発中は `nodemon` の利用も可能です）

---

## 使い方

### 基本
```
/gacha 1
/gacha 10
```

### デバッグ用（管理者のみ）
```
/gacha 10 seed:123456
```

- 同じ seed を指定すると、必ず同じ結果になります
- 管理者以外が seed を指定した場合は拒否されます

---

## ディレクトリ構成
```
assets/
  gacha/
    animations/   # 演出画像（avif）
    results/      # ガチャ結果画像（avif）
src/
  commands/       # スラッシュコマンド
  utils/          # ガチャロジック・画像生成
tests/            # Jest テスト
```

---

## テスト
```bash
npm test
```

- ガチャ確率
- 10連保証
- seed 再現性
- ピックアップ仕様

を検証しています。

---

## 注意事項
- AVIF 画像の表示は Discord クライアント依存です
- 画像合成には `sharp` を使用しています（環境によってはビルドが必要）

---

## ライセンス (画像以外)
MIT License

assets画像は https://sui-sai.jp さまの画像をお借りしています
画像については https://sui-sai.jp さまの規約に沿って取り扱いしてください
