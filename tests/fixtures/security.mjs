import {emptyState,makeItem} from '../../core.js';
export function securityState(mode='auto'){
 const s=emptyState();s.promptMode=mode;
 s.purpose='暗いときに人を検知し、AI分類結果に応じて動作を変える防犯装置の模型。実際の住宅の鍵は制御しない。';
 s.sensors=[makeItem('light','security-light'),makeItem('pir','security-pir')];s.sensors[1].connections.signal='P0';
 s.actuators=[makeItem('speaker','security-speaker'),makeItem('servo','security-servo'),makeItem('led','security-led')];s.actuators[1].connections.signal='P1';
 s.ai={mode:'image',classes:'家の人\nクロネコヤマト\n怪しい人',url:''};
 s.behavior='明るさが30未満でHC-SR505が人を検知したら画像分類する。「家の人」はサーボで鍵の模型を180度へ動かす。「クロネコヤマト」はスピーカーとLEDで配送を知らせる。「怪しい人」は警告音とLEDで知らせる。サーボは0度と180度を使う。音の高さや画面の演出は未指定。模型の停止・再動作・異常時の扱いは安全を優先する。';
 return s;
}
