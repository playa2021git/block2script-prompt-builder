# 控えめな操作フィードバック

参考: [Motion Prompt](https://showheyohtaki.github.io/motion-prompt/)、[スキル](https://github.com/showheyohtaki/motion-prompt/blob/main/skills/motion-prompt/SKILL.md)。各見本の仕様を読み、授業用UIに合わせて再構成した。外部ライブラリや通信は追加していない。

| 見本 | 使用箇所 | 調整 |
| --- | --- | --- |
| [#081 Hover lift](https://showheyohtaki.github.io/motion-prompt/#081) | 装置追加ボタンにマウスを重ねたとき | 0.3秒、easeOutCubicに近いベジェ。移動は10pxから2pxへ、影も弱くした。タッチ端末は移動なし。キーボード操作は枠の強調。 |
| [#080 Highlighter animation](https://showheyohtaki.github.io/motion-prompt/#080) | 生成結果の見出し | 0.8秒で左から線を引く。スクロール連動を生成操作に変更。淡い黄色で、生成後はそのまま表示。 |
| [#056 Toast notification](https://showheyohtaki.github.io/motion-prompt/#056) | コピー成功メッセージ | フローティング通知を既存のrole=status欄に統合。0.35秒、4pxの移動。カウントダウン・自動消去は設けず、文面は読み続けられる。 |

装置追加は追加先のカードだけを0.6秒強調する。従来の飛ぶ画像とサイドバー全体の波紋は削除した。常時ループは追加しない。OSの「動きを減らす」設定ではアニメーションと移動を停止し、文字・選択色で状態が分かる。

Motion Prompt: MIT License, Copyright (c) 2026 Shohei Ohtaki. 上記の名前・仕様を参考に独自のCSSで実装し、Canvasコードの転載はしていない。
