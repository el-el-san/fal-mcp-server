# AI Video Generator MCP Server

このMCP（Model Context Protocol）サーバーは、AI画像生成モデルを使用してテキストプロンプトや画像から動画を生成するツールを提供します。

<a href="https://glama.ai/mcp/servers/@el-el-san/fal-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@el-el-san/fal-mcp-server/badge" alt="AI Video Generator Server MCP server" />
</a>

## 対応モデル

- **Luma Ray2 Flash** - Lumaの最先端画像→動画変換モデル
- **Kling v1.6 Pro** - Klingの高品質画像→動画変換モデル

## 機能

- テキストプロンプトからの動画生成
- 開始および/または終了画像を使用した動画生成
- 動画パラメータのコントロール（アスペクト比、解像度、長さ、ループ）
- 生成ステータスの確認
- 使用するAIモデルの選択

## インストール

1. このリポジトリをクローンします
2. 依存関係をインストールします：
   ```
   npm install
   ```
3. `.env`ファイルを作成し、FAL.AI APIキーを設定します：
   ```
   FAL_KEY=your_fal_key_here
   ```
   APIキーは[FAL.AI](https://www.fal.ai/)から取得できます

## サーバーのビルド

```
npm run build
```

## サーバーの実行

サーバーを直接実行できます：

```
npm start
```

## Claude Desktopとの統合

このサーバーをClaude Desktopで使用するには、`claude_desktop_config.json`ファイルに次のように追加します：

```json
{
  "mcpServers": {
    "video-generator": {
      "command": "node",
      "args": ["your_install_path/fal-mcp-server/build/index.js"],
      "env": {
        "FAL_KEY": "your_fal_key_here"
      }
    }
  }
}
```

## 利用可能なツール

### generate-video

AIモデルを使用してテキストプロンプトおよび/または画像から動画を生成します。

**パラメータ：**
- `prompt` (必須): 生成したい動画の内容のテキスト説明
- `image_url` (オプション): 動画の開始画像URL（URLまたはbase64データURI）
- `end_image_url` (オプション): 動画の終了画像URL（URLまたはbase64データURI）
- `aspect_ratio` (デフォルト "16:9"): 動画のアスペクト比 ("16:9", "9:16", "4:3", "3:4", "21:9", "9:21")
- `resolution` (デフォルト "540p"): 動画の解像度 ("540p", "720p", "1080p")
- `duration` (デフォルト "5s"): 動画の長さ ("5s", "9s")
- `loop` (デフォルト false): 動画をループさせるかどうか
- `model` (デフォルト "luma"): 使用するAIモデル ("luma"=Ray2, "kling"=Kling v1.6 Pro)

### check-video-status

動画生成リクエストの状態を確認します。

**パラメータ：**
- `request_id` (必須): チェックするリクエストID
- `model` (デフォルト "luma"): リクエストに使用したAIモデル ("luma"=Ray2, "kling"=Kling v1.6 Pro)

## Claudeでの使用例

```
猫が毛糸玉で遊んでいる動画を生成してください。縦向きモードでお願いします。Klingモデルを使用してください。
```

Claudeは適切なパラメータで`generate-video`ツールを呼び出し、結果の動画URLを提供します。

## モデル比較

- **Luma Ray2 Flash**: 滑らかな動きとリアルな物理挙動に優れており、自然な結果が得られます。
- **Kling v1.6 Pro**: 詳細な質感と特殊な効果に優れており、スタイル化された結果が得られます。

プロンプトと希望する結果によって、最適なモデルが異なる場合があります。

## 制限事項

- 動画生成には時間がかかる場合があります（特に高解像度の場合）
- 有効なFAL.AI APIキーと十分なクレジットが必要です
- 高解像度や長い動画はより多くのクレジットを消費します
- 両モデルともFAL.AIのクレジットを消費します（料金はモデルごとに異なる場合があります）

## トラブルシューティング

### APIキーエラー

FAL_KEY環境変数が正しく設定されていることを確認してください。Claude Desktop設定ファイル内で直接設定することも可能です。

### 動画生成エラー

動画生成中にエラーが発生した場合、詳細なエラーメッセージがログに記録されます。一般的な問題は：

- APIキーの無効または期限切れ
- アカウントのクレジット不足
- 不適切なプロンプトまたは画像
- サーバー側の一時的な問題

エラーが続く場合は、しばらく待ってから再試行するか、プロンプトを変更してみてください。

## ライセンス

MIT