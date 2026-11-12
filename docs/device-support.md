# 装置の対応状況と、先生と確認したいこと

確認日：2026-11-12。教材への掲載と、Block2Scriptでそのまま実機を動かせることは別です。このアプリは装置や動作の情報を整理するもので、接続・実機動作を保証するものではありません。

## 確認に使った資料

- [再発明デバイスガイド](https://playa2021git.github.io/reinvent-device-guide/) — [装置データ](https://github.com/playa2021git/reinvent-device-guide/blob/f6f69849ac4c42f65a7cf3b95b14878ce2ccd415/js/devices.js)
- [Block2Script](https://github.com/playa2021git/block2script/tree/732e0d4e7a465477168f595ae5d9313764ff8e14) の固定取得元Microbit More：`7d7b216ac046f03472cfe5de267ca7db9ae0e877`。[命令定義](https://github.com/microbit-more/mbit-more-v2/blob/7d7b216ac046f03472cfe5de267ca7db9ae0e877/src/vm/extensions/block/index.js)と[端子定義](https://github.com/microbit-more/mbit-more-v2/blob/7d7b216ac046f03472cfe5de267ca7db9ae0e877/src/vm/extensions/block/microbit-more.js)を照合。
- [pxt-mini-scales](https://github.com/playa2021git/pxt-mini-scales/tree/d86fe57a2a47f931e5fe527e167c99cccb87e488) — READMEとmini-scales.ts。
- [micro:bitの端子仕様](https://tech.microbit.org/hardware/edgeconnector/) — 標準I2CはSCL=P19、SDA=P20。
- TM2Scratchの固定取得元：`champierre/tm2scratch` の `d018790a8afbb2bfc793ea6b8b5ef4b4e5abbd1e`。

## 選択できる装置

|区分|装置|B2S側で確認できたこと|残る確認|
|---|---|---|---|
|S・内蔵|A・Bボタン、タッチロゴ、明るさ、温度、マイク、加速度、コンパス／磁気|Microbit Moreに対応する命令定義あり|実機・ファームウェア・接続。ロゴ／マイクはV2|
|A・内蔵|5×5 LED、スピーカー|表示・音の命令定義あり|実機・接続。本体スピーカーはV2|
|S・外付け|人感センサ HC-SR505|デジタル入力命令あり|電圧・配線・装置固有の動作|
|S・外付け|土壌水分センサ|アナログ入力命令あり|配線・実測したしきい値|
|S・外付け|超音波距離センサ HC-SR04|教材にはMakeCode Sonarの説明あり|B2Sで距離をcmとして取得する手順は未確認。TRIG/ECHOの役割と配線は入力できるが、対応済みとはしない。電圧・接続回路も要確認|
|S・外付け|重量センサ（M5Stack Unit Mini Scales）|MakeCode拡張のweightは整数g、tareは風袋引き。I2C=0x26。Microbit Moreにはラベル付きデータ通信の命令あり|両者をつなぐ専用プログラム、B2Sで受け取るラベル名、通常のMicrobit More通信との両立は別途確認|
|A・外付け|180°サーボモータ（SG90）|サーボ角度出力命令あり|配線・電源・機械的な角度範囲|
|A・外付け|振動モータ|PWM（アナログ）出力命令あり|教材のGroveモジュール、電源・配線|
|A・外付け|デジタルマイクロポンプ|デジタル出力命令あり|教材のポンプ用モジュール、Grove Shieldの実際の信号ピン・電源、給水時間・停止・再動作条件|

外付け信号線の選択肢は、授業の基本端子P0/P1/P2に絞っています。これは対応拡張の入出力対象との共通範囲で、Groveコネクターをどこへ挿しても使えるという意味ではありません。教材でP0が例示されていても生徒の実際の配線とは限らないため、初期値は未選択です。3V/5V/GNDは制御端子の選択肢に混ぜず、装置説明と実物で確認します。

重量センサのSCL/SDAは標準micro:bitの固定端子を表示し、ShieldではI2Cコネクターに接続します。サンプルの0x26は拡張ソースで確認できた値です。通信ラベルの例としてweightを表示しますが、初期値に採用せず、未入力ならGemにも確認を求めます。MakeCodeの関数名weightと通信ラベルweightが自動的につながるわけではありません。cmdもMakeCode拡張で実装されたブロックではありません。

教材に掲載されていない汎用の外付けLED、ブザー、DCモータを新しい「対応済み」装置として追加していません。

## AIの扱い

- **画像認識**：TM2Scratchには画像モデルURL・ラベル・画像ラベルイベントの命令あり。
- **音声認識**：TM2Scratchには音声モデルURL・ラベル・音声ラベルイベントの命令あり。実マイクでの動作は別途確認。
- **ポーズ認識**：Teachable Machineのポーズ分類モデルを読み込む対応は未確認。PoseNet2Scratchが姿勢を検出できることを根拠に、TMのポーズClassが利用できるとは判断しない。指示文に未確認と明示する。

モデルURLは任意。画像・音声のURL命令は確認できたが、選択した実際のモデル・読み込み済み拡張が不明な場合もあるため、未入力でも生成を認めGemへ確認事項として伝える。アプリから外部モデルを取得したり、Classを検証するため外部へ送信したりはしない。

## 端子共有と入力チェック

- 通常の信号端子を複数装置で使う場合、またはTRIG/ECHOで同じ端子を使う場合は生成を止める。
- I2CのSCL/SDA共有そのものはエラーにせず警告を表示する。同じアドレスを入力した重量センサが複数あればエラーとする。アドレス未入力なら共有可能とは断定しない。
- 内蔵装置は外付け端子不要。同じ内蔵装置を複数の用途でリストに入れても、本体が増えたと判断しないようGem／授業で確認する。
- Classは改行で分け、文字列を変更しない。同名重複と空白だけの行はエラー。大文字小文字や前後空白が異なるClassは別名として保持する。JSON配列で出力するため、引用符・改行以外の空白も区別できる。

## 猫の給水サンプルで決めていないこと

ポンプの接続端子、B2Sとの橋渡しプログラムと通信ラベル、猫の接近を知る方法、給水時間、停止条件、連続給水を解除する条件。目的・重量１０ｇ以下・C1判定・連続給水防止という依頼された条件だけを入れ、足りない条件はGemから質問してもらう。端子の未入力は生成前に知らせる。
