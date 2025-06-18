// ゲームの状態を管理するオブジェクト
const game = {
    scenario: null,
    currentScene: null,
    isChoiceMode: false,
    narrationEnabled: true,
    narrationVoice: null,
    currentNarration: null,
    narrationRate: 1.0,  // 読み上げ速度
    narrationPitch: 1.0, // 音程
    currentNarrationAudio: null, // カスタムナレーション音声
    
    // 詐欺シミュレーション用の状態変数
    playerState: {
        risk: 0,          // リスク値 (0-100)
        trust: 0,         // 信頼度 (0-100)
        money: 0,         // 所持金 (万円単位)
        target: null,     // ターゲットタイプ（'company'=不動産会社, 'individual'=個人投資家）
        documents: [],    // 所持している偽造書類
        accomplices: [],  // 共犯者情報
        flags: {}         // 各種フラグ
    },
    
    // タイトル画面の初期化
    initTitleScreen() {
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('title-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            this.loadScenario();
        });
    },
    
    // シナリオデータをロード
    async loadScenario() {
        try {
            const response = await fetch('scenario_with_narration.json');
            if (!response.ok) {
                throw new Error('シナリオデータのロードに失敗しました');
            }
            this.scenario = await response.json();
            this.setupNarration();
            this.resetPlayerState();
            this.startGame();
        } catch (error) {
            console.error('エラー:', error);
            document.getElementById('dialog').textContent = 'シナリオデータのロードに失敗しました。';
        }
    },
    
    // プレイヤー状態を初期化
    resetPlayerState() {
        this.playerState = {
            risk: 0,
            trust: 0,
            money: 100,  // 初期資金100万円
            target: null,
            documents: [],
            accomplices: [],
            flags: {}
        };
        this.updateStatsDisplay();
    },
    
    // ゲームオーバー判定
    checkGameOver() {
        // リスク値による自動ゲームオーバーを一時的に無効化
        /*
        if (this.playerState.risk >= 85) {
            return "ending_arrested";
        }
        
        if (this.playerState.money <= 0) {
            return "abort_plan";
        }
        */
        
        return null; // ゲームオーバーでない
    },
    
    // 状態表示を更新
    updateStatsDisplay() {
        // リスクゲージ更新
        document.getElementById('risk-bar').style.width = `${this.playerState.risk}%`;
        document.getElementById('risk-value').textContent = `${this.playerState.risk}%`;
        
        // 危険度が高い場合のエフェクト
        if (this.playerState.risk > 75) {
            document.getElementById('risk-bar').classList.add('high-risk');
        } else {
            document.getElementById('risk-bar').classList.remove('high-risk');
        }
        
        // 信頼度ゲージ更新
        document.getElementById('trust-bar').style.width = `${this.playerState.trust}%`;
        document.getElementById('trust-value').textContent = `${this.playerState.trust}%`;
        
        // 所持金更新
        document.getElementById('money-value').textContent = `${this.playerState.money}万円`;
    },
    
    // 音声ナレーションの設定
    setupNarration() {
        // 音声合成APIをサポートしているか確認
        if ('speechSynthesis' in window) {
            // 利用可能な音声を取得
            const voices = window.speechSynthesis.getVoices();
            
            // 日本語の音声を探す
            const japaneseVoice = voices.find(voice => voice.lang === 'ja-JP');
            
            // 日本語の音声があれば設定、なければデフォルト音声を使用
            this.narrationVoice = japaneseVoice || voices[0];
            
            // 音声が空の場合（初回ロード時など）は音声リストのロードイベントを設定
            if (voices.length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    const newVoices = window.speechSynthesis.getVoices();
                    const newJapaneseVoice = newVoices.find(voice => voice.lang === 'ja-JP');
                    this.narrationVoice = newJapaneseVoice || newVoices[0];
                };
            }
            
            // ナレーションコントロールUIを追加
            this.setupNarrationControls();
        } else {
            console.warn('このブラウザは音声合成をサポートしていません');
            this.narrationEnabled = false;
            
            // ナレーションコントロールを非表示
            const narrationControls = document.getElementById('narration-controls');
            if (narrationControls) {
                narrationControls.style.display = 'none';
            }
        }
    },
    
    // ナレーションコントロールUIのセットアップ
    setupNarrationControls() {
        const controls = document.getElementById('narration-controls');
        if (!controls) {
            // コントロールUIが存在しない場合は作成
            const controlsDiv = document.createElement('div');
            controlsDiv.id = 'narration-controls';
            controlsDiv.innerHTML = `
                <button id="toggle-narration">ナレーション: オン</button>
                <div class="slider-container">
                    <label>速度: </label>
                    <input type="range" id="narration-rate" min="0.5" max="2" step="0.1" value="1">
                    <span id="rate-value">1.0</span>
                </div>
            `;
            // #controlsではなく#game-container直下に追加
            document.getElementById('game-container').appendChild(controlsDiv);
            
            // トグルボタンのイベントリスナー
            document.getElementById('toggle-narration').addEventListener('click', () => {
                this.narrationEnabled = !this.narrationEnabled;
                document.getElementById('toggle-narration').textContent = 
                    `ナレーション: ${this.narrationEnabled ? 'オン' : 'オフ'}`;
                
                // ナレーションが無効になった場合、現在の読み上げを停止
                if (!this.narrationEnabled && this.currentNarration) {
                    window.speechSynthesis.cancel();
                }
            });
            
            // 速度スライダーのイベントリスナー
            document.getElementById('narration-rate').addEventListener('input', (e) => {
                this.narrationRate = parseFloat(e.target.value);
                document.getElementById('rate-value').textContent = this.narrationRate.toFixed(1);
                
                // 現在のナレーションに適用
                if (this.currentNarration && this.narrationEnabled) {
                    // 現在の読み上げを一旦停止
                    window.speechSynthesis.cancel();
                    
                    // 新しい速度で読み上げを再開
                    this.speakText(document.getElementById('dialog').textContent);
                }
            });
        }
    },
    
    // テキストを音声で読み上げる
    speakText(text) {
        if (!this.narrationEnabled || !('speechSynthesis' in window)) {
            return;
        }
        
        // 現在の読み上げを停止
        window.speechSynthesis.cancel();
        
        // 新しい発話オブジェクトを作成
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 音声を設定
        if (this.narrationVoice) {
            utterance.voice = this.narrationVoice;
        }
        
        // 速度と音程を設定
        utterance.rate = this.narrationRate;
        utterance.pitch = this.narrationPitch;
        
        // 発話を開始
        window.speechSynthesis.speak(utterance);
        
        // 現在のナレーションを保存
        this.currentNarration = utterance;
    },
    
    // ゲーム開始
    startGame() {
        this.showScene('intro');
    },
    
    // タイトル画面に戻る
    returnToTitle() {
        // BGMを停止
        if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
        }
        
        // ナレーションを停止
        if (this.currentNarration) {
            window.speechSynthesis.cancel();
            this.currentNarration = null;
        }
        
        // カスタムナレーション音声を停止
        if (this.currentNarrationAudio) {
            this.currentNarrationAudio.pause();
            this.currentNarrationAudio.currentTime = 0;
            this.currentNarrationAudio = null;
        }
        
        // ゲーム画面を非表示にし、タイトル画面を表示
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('title-screen').style.display = 'flex';
        
        // プレイヤー状態をリセット
        this.resetPlayerState();
    },
    
    // 状態更新（シーン選択によるステータスの変化）
    updatePlayerState(effects) {
        if (!effects) return;
        
        // 各ステータスの更新
        if (effects.risk !== undefined) {
            this.playerState.risk = Math.max(0, Math.min(100, this.playerState.risk + effects.risk));
        }
        
        if (effects.trust !== undefined) {
            this.playerState.trust = Math.max(0, Math.min(100, this.playerState.trust + effects.trust));
        }
        
        if (effects.money !== undefined) {
            this.playerState.money += effects.money;
        }
        
        // ターゲット設定
        if (effects.target) {
            this.playerState.target = effects.target;
        }
        
        // 偽造書類の追加
        if (effects.documents) {
            this.playerState.documents = this.playerState.documents.concat(effects.documents);
        }
        
        // 共犯者の追加
        if (effects.accomplices) {
            this.playerState.accomplices = this.playerState.accomplices.concat(effects.accomplices);
        }
        
        // フラグの設定
        if (effects.flags) {
            for (const [key, value] of Object.entries(effects.flags)) {
                this.playerState.flags[key] = value;
            }
        }
        
        // 画面表示の更新
        this.updateStatsDisplay();
    },
    
    // シーンを表示
    showScene(sceneId) {
        console.log(`シーン表示: ${sceneId}`); // デバッグ用ログ出力
        
        // 特殊なシーンIDの処理
        if (sceneId === 'return_to_title') {
            this.returnToTitle();
            return;
        }
        
        // シーンを検索
        const scene = this.scenario.scenes.find(scene => scene.id === sceneId);
        if (!scene) {
            console.error(`シーンが見つかりません: ${sceneId}`);
            return;
        }
        
        console.log(`シーン読み込み: ${scene.id}, 選択肢: ${scene.choices ? scene.choices.length : 'なし'}`); // デバッグ用ログ出力
        this.currentScene = scene;
        
        // 既存のナレーションを停止
        if (this.currentNarration) {
            window.speechSynthesis.cancel();
            this.currentNarration = null;
        }
        // 既存のカスタムナレーション音声を停止
        if (this.currentNarrationAudio) {
            this.currentNarrationAudio.pause();
            this.currentNarrationAudio.currentTime = 0;
            this.currentNarrationAudio = null;
        }
        
        // BGMの変更（もし指定されていれば）
        if (scene.bgm) {
            this.changeBGM(scene.bgm);
        }
        
        // プレイヤー状態の更新（シーンに効果があれば）
        if (scene.effects) {
            this.updatePlayerState(scene.effects);
        }
        
        // 背景を設定
        if (scene.background) {
            document.getElementById('background').style.backgroundImage = `url('${scene.background}')`;
        }
        
        // キャラクターを設定
        const characterElem = document.getElementById('character');
        if (scene.character) {
            characterElem.src = scene.character;
            characterElem.style.display = 'block';
        } else {
            characterElem.style.display = 'none';
        }
        
        // 話者を設定
        document.getElementById('speaker').textContent = scene.speaker || '';
        
        // テキストを設定
        document.getElementById('dialog').textContent = scene.text;
        
        // ナレーション（カスタム音声 or Web Speech API）
        if (scene.narration) {
            // カスタム音声ファイルが指定されている場合
            this.currentNarrationAudio = new Audio(scene.narration);
            this.currentNarrationAudio.play();
        } else if (scene.text) {
            // テキスト読み上げ（従来通り）
            let narrateText = scene.text;
            if (scene.speaker && scene.speaker !== 'あなた') {
                narrateText = `${scene.speaker}。${narrateText}`;
            }
            this.speakText(narrateText);
        }
        
        // 選択肢の表示/非表示を切り替え
        this.isChoiceMode = !!scene.choices;
        const choicesContainer = document.getElementById('choices-container');
        
        if (this.isChoiceMode) {
            console.log(`選択肢表示モード: ${scene.id}, 選択肢数: ${scene.choices.length}`); // デバッグ用ログ出力
            
            // 選択肢を表示
            choicesContainer.innerHTML = '';
            choicesContainer.style.display = 'flex';
            
            // ゲームオーバー画面の場合は特別に強調表示
            if (scene.id === 'game_over') {
                console.log('ゲームオーバー画面の選択肢を表示'); // デバッグ用ログ出力
                choicesContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                choicesContainer.style.borderColor = '#ff0000';
                choicesContainer.style.padding = '20px';
            }
            
            scene.choices.forEach((choice, index) => {
                console.log(`選択肢${index+1}: ${choice.text} -> ${choice.next}`); // デバッグ用ログ出力
                
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.textContent = choice.text;
                
                // ゲームオーバー画面の選択肢の場合は特別なスタイル
                if (scene.id === 'game_over') {
                    button.style.fontSize = '18px';
                    button.style.padding = '15px 25px';
                    button.style.marginBottom = '10px';
                    button.style.border = '2px solid #ff0000';
                }
                
                button.addEventListener('click', () => {
                    console.log(`選択肢クリック: ${choice.text} -> ${choice.next}`); // デバッグ用ログ出力
                    
                    // 選択肢に効果があれば適用
                    if (choice.effects) {
                        this.updatePlayerState(choice.effects);
                    }
                    
                    // ゲームオーバー判定
                    const gameOverScene = this.checkGameOver();
                    if (gameOverScene) {
                        this.showScene(gameOverScene);
                    } else {
                        this.showScene(choice.next);
                    }
                    
                    choicesContainer.style.display = 'none';
                });
                choicesContainer.appendChild(button);
            });
            
            // 次へボタンを非表示
            document.getElementById('next-btn').style.display = 'none';
        } else {
            // 選択肢を非表示
            choicesContainer.style.display = 'none';
            
            // 次へボタンを表示
            document.getElementById('next-btn').style.display = 'block';
        }
    },
    
    // BGMを変更
    changeBGM(bgmPath) {
        if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
        }
        
        bgmAudio = new Audio(bgmPath);
        bgmAudio.loop = true;
        bgmAudio.volume = 0.5;
        bgmAudio.play().catch(e => {
            console.warn('BGMの自動再生がブロックされました:', e);
        });
    },
    
    // 次のシーンへ
    nextScene() {
        console.log(`次のシーンへ: 現在=${this.currentScene.id}, 選択肢モード=${this.isChoiceMode}, 次のシーン=${this.currentScene.next || 'なし'}`); // デバッグ用ログ出力
        
        if (this.isChoiceMode || !this.currentScene.next) {
            console.log('次のシーンに進めません: 選択肢モードか次のシーンがありません');
            return;
        }
        
        // ゲームオーバー判定
        const gameOverScene = this.checkGameOver();
        if (gameOverScene) {
            console.log(`ゲームオーバー判定: ${gameOverScene}に移動`);
            this.showScene(gameOverScene);
            return;
        }
        
        console.log(`通常の遷移: ${this.currentScene.next}に移動`);
        this.showScene(this.currentScene.next);
    }
};

// BGM用Audioオブジェクトをグローバルに用意
let bgmAudio = null;

// ゲーム開始時の処理
document.addEventListener('DOMContentLoaded', () => {
    // タイトル画面の初期化
    game.initTitleScreen();
    
    // 既存の「次へ」ボタンやシナリオロード処理
    document.getElementById('next-btn').addEventListener('click', () => {
        game.nextScene();
    });
});

// キーボードイベント（スペースキーで次へ）
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !game.isChoiceMode) {
        game.nextScene();
    }
});