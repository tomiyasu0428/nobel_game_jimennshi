# Google TTSによるナレーション自動生成ガイド

このスクリプトは、scenario.jsonファイルを読み込み、Google Cloud Text-to-Speech APIを使用して各シーンのナレーションを自動生成するものです。

## 準備

1. **Google Cloud Platformの設定**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - プロジェクトを作成（または既存のプロジェクトを使用）
   - Cloud Text-to-Speech APIを有効化
   - サービスアカウントを作成し、JSONキーファイルをダウンロード

2. **必要なパッケージのインストール**
   ```bash
   npm install @google-cloud/text-to-speech
   ```

3. **環境変数の設定**
   ```bash
   # Macの場合
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-project-credentials.json"
   
   # Windowsの場合
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your-project-credentials.json
   ```

## 実行方法

1. ターミナル（コマンドプロンプト）で以下のコマンドを実行します：
   ```bash
   node generate_narration.js
   ```

2. スクリプトは次の処理を行います：
   - scenario.jsonのすべてのシーンを処理
   - 各シーンのテキストをナレーション用に変換
   - Google TTSでMP3ファイルを生成
   - 生成したファイルを `src/assets/narration/` フォルダに保存
   - narrationプロパティを追加したシナリオを `scenario_with_narration.json` として保存

3. 処理が完了したら、`scenario_with_narration.json`を確認し、問題がなければ元の`scenario.json`に置き換えてください。

## カスタマイズ

音声設定は以下の部分でカスタマイズできます：

```javascript
const request = {
  input: { text: narrateText },
  voice: {
    languageCode: 'ja-JP',
    name: 'ja-JP-Neural2-B',  // 音声の種類
    ssmlGender: 'MALE'        // 性別
  },
  audioConfig: {
    audioEncoding: 'MP3',
    speakingRate: 1.0,        // 話速 (0.25-4.0)
    pitch: 0.0,               // 音程 (-20.0-20.0)
  },
};
```

### 音声の種類

日本語の主な音声には以下があります：
- `ja-JP-Neural2-B` (男性)
- `ja-JP-Neural2-C` (女性)
- `ja-JP-Neural2-D` (男性)
- `ja-JP-Wavenet-A` (女性)
- `ja-JP-Wavenet-B` (女性)
- `ja-JP-Wavenet-C` (男性)
- `ja-JP-Wavenet-D` (男性)

詳細な音声リストは[Googleのドキュメント](https://cloud.google.com/text-to-speech/docs/voices)を参照してください。

## 注意事項

- Google Cloud Text-to-Speech APIは有料サービスです（一定量の無料枠あり）
- APIの使用量に応じて課金されるため、利用状況を監視してください
- 生成したナレーションファイルは著作権に注意して使用してください