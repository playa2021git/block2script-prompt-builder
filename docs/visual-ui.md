# 画像カードUIの実装と素材

開発ブランチ：`feat/visual-device-cards`。

## 画面と互換性

現在の3領域と切り替え式の作業パネルは [workshop-ui.md](workshop-ui.md) を参照してください。このページは引き続き素材の出典記録として利用します。画像は機能の概念図であり、配線図ではありません。スピーカーは一般的な図ですが、接続設定はmicro:bit V2内蔵を維持しています。

## 画像一覧・出典

出典：[playa2021git/reinvent-device-guide](https://github.com/playa2021git/reinvent-device-guide)、参照commit `f6f69849ac4c42f65a7cf3b95b14878ce2ccd415`、`assets/devices/`。参照リポジトリは読み取りのみ。

参照元のMIT License（Copyright (c) 2026 TechLoveworkcatlove）を確認し、全文を `assets/devices/GUIDE-LICENSE.txt` に同梱しています。画像別の別ライセンス記載は見つかりませんでした。再利用画像は実写風AI画像であり、実物の形状・配線を保証する写真ではありません。WebP圧縮、縮小、概念図の追加を行っています。

| このサイトの画像（assets/devices/） | 参照元ファイル | 表現 |
| --- | --- | --- |
| buttons.svg | microbit-v2-front-ai.png | A・Bボタンを丸で強調 |
| touch.svg | microbit-v2-front-ai.png | 金色ロゴに触れる指 |
| light.svg | microbit-v2-front-ai.png | LED面に光が当たる図 |
| led.svg | microbit-v2-front-ai.png | 5×5のLED面を強調 |
| pir.svg | pir-hc-sr505-ai.png | 人感センサ＋動く人 |
| distance.svg | hc-sr04-ai.png | HC-SR04＋超音波・測定距離 |
| soil.svg | soil-moisture-ai.png | 土壌水分センサ＋土・水滴 |
| scale.svg | weight-sensor-ai.png | 重量センサ＋分銅 |
| servo.svg | servo-sg90-ai.png | SG90＋回転矢印 |
| vibrator.svg | vibration-motor-ai.png | 振動モジュール＋振動線 |
| pump.svg | digital-pump-ai.png | ポンプモジュール＋水を送る図 |
| ai-image.webp | ai-image-learning.png | カメラで物を分類する学習風景 |
| ai-sound.webp | ai-sound-learning.png | 拍手を音声分類する学習風景 |
| ai-pose.webp | ai-pose-learning.png | 姿勢を分類する学習風景 |
| temperature.svg | 新規SVG | 温度計 |
| microphone.svg | 新規SVG | 集音するマイク・音波 |
| accelerometer.svg | 新規SVG | XYZの3方向と傾き |
| compass.svg | 新規SVG | 方位磁針 |
| speaker.svg | 新規SVG | 一般的なスピーカーと音波 |

装置16画像とAI3画像はローカル配信。SVG内の再利用画像は圧縮WebPをdata URIとして内包し、別サイトに依存しません。合計約380KB（ファイルシステム表示）。原寸PNGや不要な参考画像は同梱していません。

## 検証と公開前の確認

- `npm test`：既存ロジック13件。
- `npm run test:browser`：全カードの画像パス・装置名・S/A区分、画像decode、キーボード追加、複数追加・削除、全装置の必要入力数、画像失敗時の名前での選択、旧v1保存データ復元、猫サンプル生成文の一致、音声AIを使う新規作品の画面操作・生成文の一致、ポーズ未確認表示を検証。従来のコピー・保存・端子重複・エラー検証も維持。
- 1366 / 1024 / 768 / 390pxで横はみ出しとカード同士の重なりを検査。新しいワークショップの検証はworkshop-ui.mdを参照。
- `TEST_URL=http://127.0.0.1:5181/block2script-prompt-builder/ npm run test:browser`：サブディレクトリでも同じ検証。
- スクリーンショット：git対象外 `work/sensors.png`、`actuators.png`、`ai.png`、`chromebook-catalog.png`、`desktop.png`、`mobile.png`。各ブラウザーテストの実行先に合わせて更新されます。

GitHub Pages公開前には、PR差分と素材出典を確認し、既存Actionsの全テストを通してください。Actionsはassets/全体とdocs/を配布するため、画像・ライセンスも含まれます。公開後はキャッシュを更新し、サブディレクトリ上で画像、コピー、保存復元を確認してください。学校の実Chromebook、タッチ端末、micro:bit実機、配線、Gemの生成コードは別途確認が必要です。この変更ではデプロイしていません。
