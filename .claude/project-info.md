# Project Information

## 概要
本プロジェクトは、Discord 上で動作するガチャ機能付き BOT です。  
キャラクターガチャ（銀 / 金 / 虹）およびピックアップ演出を提供します。

## 技術スタック
- Node.js
- discord.js
- Aimless.js (乱数生成)
- jest（テスト）
- dotenv（環境変数管理）
- nodemon（開発用）

## ブランチ運用
- `master` - 安定版（リリース対象）
- `develop` - 次期リリース開発（機能開発のベース）
- `feature/*` - 機能追加・修正用（developから分岐）
- master へのマージはdevelopからのみ許可。テスト通過を前提とする

## コーディング規約
- rules.mdを参照

## ディレクトリ構成
- tree.txtを参照

## 乱数（seed）設計

### 基本方針
- ガチャ結果は疑似乱数（seed）により決定される
- 呼び出し側（Discordコマンド）は **Aimless を直接扱わない**
- seed は gachaLogic 内で生成・管理する

### seed の扱い
- seed が指定された場合  
  → 同じ seed なら **必ず同じ結果**になる（再現性あり）
- seed が省略された場合  
  → 以下の式で **1回だけ生成**する
```js
Date.now() + Math.floor(Math.random() * 1e9)
```
- 10連ガチャでは、生成した seed を元に 1つの RNG を使い回す

## アセット配置

### ガチャアニメーション (assets/gacha/animations/)
- normal.avif: 通常ガチャアニメーション
- guaranteed.avif: 最高レア確定ガチャアニメーション

### ガチャ結果画像 (assets/gacha/results/)
- すべての画像は
- silver.avif: 銀演出（低レア）
- gold.avif: 金演出（中レア）
- rainbow.avif: 虹演出（最高レア）
- pickup.avif: ピックアップ演出

## ガチャ仕様

### レアリティ確率（通常）
| レアリティ | 確率 |
|------------|------|
| 銀         | 79%  |
| 金         | 18%  |
| 虹         | 3%   |

### 10連ガチャ
- 10枠目は **金以上確定**
- 1～9枠目は通常確率

### ピックアップ仕様
- ピックアップは **虹レアリティ時のみ判定**
- 虹のうち **約 23.3%（0.7% / 3%）** がピックアップ
- 現仕様では **金以下でピックアップが発生することはない**

## 使い方
### 1. コマンド登録
- npm run deploy

### 2. BOT起動
- npm run dev   # 開発用
- npm start     # 本番用

### 3. Discordで実行
- /gacha count:1連
- /gacha count:10連
- /gacha count:10連 seed:12345  # デバッグ用

