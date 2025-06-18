// Google TTS APIを使用してナレーションを自動生成するスクリプト

const fs = require('fs');
const path = require('path');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

// Google Cloud認証情報を設定
// 注: 実行前にGoogleのサービスアカウントキーのJSONファイルパスを環境変数に設定する必要があります
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-project-credentials.json"

// クライアントを初期化
const client = new TextToSpeechClient();

// scenario.jsonを読み込む
const scenarioPath = path.join(__dirname, 'scenario.json');
const rawData = fs.readFileSync(scenarioPath);
const scenario = JSON.parse(rawData);

// 出力ディレクトリの確認と作成
const outputDir = path.join(__dirname, 'src/assets/narration');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// シーンごとにナレーションを生成する関数
async function generateNarration(scene) {
  // ナレーション用のテキストを準備（話者名は含めない）
  let narrateText = scene.text;
  
  // 話者名は含めない - テキストのみを使用
  // 話者名を含める場合はこの行のコメントを外す
  // if (scene.speaker && scene.speaker !== 'あなた' && scene.speaker !== '???') {
  //   narrateText = `${scene.speaker}。${narrateText}`;
  // }
  
  // すでにnarrationプロパティがある場合はスキップ
  if (scene.narration) {
    console.log(`シーン ${scene.id} はすでにナレーションファイルが指定されています: ${scene.narration}`);
    return;
  }
  
  // 出力ファイル名を設定
  const outputFile = path.join(outputDir, `${scene.id}.mp3`);
  const outputPath = `src/assets/narration/${scene.id}.mp3`;
  
  // キャラクターごとの声を設定（話者名は読み上げない）
  let voiceParams = {
    languageCode: 'ja-JP',
    name: 'ja-JP-Neural2-D',  // デフォルト：男性声（ナレーター用）
    ssmlGender: 'MALE'
  };
  
  let audioParams = {
    audioEncoding: 'MP3',
    speakingRate: 1.0,  // 話速 (0.25-4.0)
    pitch: 0.0,  // 音程 (-20.0-20.0)
  };
  
  // 各キャラクターごとに専用の音声設定をする
  if (scene.speaker) {
    switch(scene.speaker) {
      case '鬼頭':
        // 悪徳師匠：低めの男性声、やや遅め
        voiceParams.name = 'ja-JP-Neural2-D';
        audioParams.pitch = -2.0;
        audioParams.speakingRate = 0.9;
        break;
      case '元不動産業者':
      case 'ベテラン詐欺師':
        // 落ち着いた男性声
        voiceParams.name = 'ja-JP-Neural2-B';
        audioParams.pitch = -1.0;
        audioParams.speakingRate = 1.0;
        break;
      case '素人の知り合い':
        // 若い男性声、早め
        voiceParams.name = 'ja-JP-Neural2-B';
        audioParams.pitch = 1.0;
        audioParams.speakingRate = 1.2;
        break;
      case '元役者':
      case '口のうまい詐欺師':
        // 華やかな男性声
        voiceParams.name = 'ja-JP-Neural2-B';
        audioParams.pitch = 0.5;
        audioParams.speakingRate = 1.1;
        break;
      case '不動産会社担当者':
        // 女性声、ビジネスライク
        voiceParams.name = 'ja-JP-Neural2-C';
        voiceParams.ssmlGender = 'FEMALE';
        audioParams.pitch = 1.0;
        audioParams.speakingRate = 1.0;
        break;
      case '個人投資家':
        // 男性声、やや高め
        voiceParams.name = 'ja-JP-Neural2-B';
        audioParams.pitch = 0.0;
        audioParams.speakingRate = 0.95;
        break;
      case '法務部長':
        // 厳格な男性声
        voiceParams.name = 'ja-JP-Neural2-D';
        audioParams.pitch = -3.0;
        audioParams.speakingRate = 0.9;
        break;
      case '警備員':
      case '警察官':
        // 強い男性声
        voiceParams.name = 'ja-JP-Neural2-D';
        audioParams.pitch = -1.5;
        audioParams.speakingRate = 0.95;
        break;
      case 'あなた':
        // プレイヤーの声は生成しない
        return null;
      default:
        // その他のキャラクターはデフォルト設定
        break;
    }
  } else {
    // 話者がない場合（ナレーション）はデフォルト設定
  }
  
  // TTSリクエストを設定
  const request = {
    input: { text: narrateText },
    voice: voiceParams,
    audioConfig: audioParams,
  };

  try {
    // TTSリクエストを実行
    const [response] = await client.synthesizeSpeech(request);
    
    // 出力ファイルに書き込み
    fs.writeFileSync(outputFile, response.audioContent, 'binary');
    console.log(`ナレーションを生成しました: ${outputFile}`);
    
    // シーンにnarrationプロパティを追加
    return outputPath;
  } catch (error) {
    console.error(`シーン ${scene.id} のナレーション生成に失敗しました:`, error);
    return null;
  }
}

// すべてのシーンを処理する
async function processAllScenes() {
  const updatedScenes = [];
  
  for (const scene of scenario.scenes) {
    console.log(`シーン ${scene.id} を処理中...`);
    
    // ナレーションを生成
    const narrationPath = await generateNarration(scene);
    
    // シーンをコピーして新しいnarrationプロパティを追加
    const updatedScene = { ...scene };
    if (narrationPath) {
      updatedScene.narration = narrationPath;
    }
    
    updatedScenes.push(updatedScene);
  }
  
  // 更新されたシナリオを作成
  const updatedScenario = {
    scenes: updatedScenes
  };
  
  // 更新されたシナリオをファイルに書き込み
  const updatedScenarioPath = path.join(__dirname, 'scenario_with_narration.json');
  fs.writeFileSync(updatedScenarioPath, JSON.stringify(updatedScenario, null, 2));
  console.log(`更新されたシナリオを保存しました: ${updatedScenarioPath}`);
}

// メイン処理を実行
processAllScenes().catch(console.error);

// 使用方法：
// 1. Google Cloud Platformでテキスト読み上げAPIを有効にする
// 2. サービスアカウントキーを取得する
// 3. npm install @google-cloud/text-to-speech を実行して依存パッケージをインストール
// 4. GOOGLE_APPLICATION_CREDENTIALS環境変数を設定
// 5. node generate_narration.js を実行