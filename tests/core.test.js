import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEVICES,findDevice} from '../data/devices.js';
import {emptyState,sampleState,wateringSampleState,validate,generatePrompt,restoreState,inputSignature,makeItem} from '../core.js';
const valid=()=>({...emptyState(),purpose:'温度を知らせる',behavior:'温度が高くなったら画面に表示する'});
test('SとAを別々に管理し、装置設定に必要な接続仕様がある',()=>{assert.equal(DEVICES.length,16);for(const d of DEVICES){assert.ok(['S','A'].includes(d.group));assert.equal(d.builtIn,d.fields.length===0);assert.ok(d.support);}assert.equal(findDevice('distance').fields.filter(f=>f.kind==='pin').length,2);assert.equal(findDevice('scale').fields.filter(f=>f.sharing==='i2c').length,2);});
test('必須項目が不足すると生成しない',()=>{assert.equal(validate(emptyState()).errors.length,2);assert.throws(()=>generatePrompt(emptyState()));});
test('使わない機能・装置を指示文に入れない',()=>{const p=generatePrompt(valid());assert.ok(!p.includes('【Teachable Machine】'));assert.ok(!p.includes('【S：'));assert.ok(!p.includes('【A：'));assert.ok(!p.includes('ポンプ'));});
test('既製品の夜間防犯ライトは明るさと人感のAND条件で25個のLEDを制御する',()=>{const s=sampleState();assert.match(s.purpose,/暗い場所で人の動きを検知/);assert.deepEqual(s.sensors.map(i=>i.deviceId),['light','pir']);assert.deepEqual(s.actuators.map(i=>i.deviceId),['led']);assert.equal(s.ai.mode,'none');assert.equal(s.sensors[1].connections.signal,undefined);assert.ok(validate(s).errors.some(e=>e.message.includes('人感センサ')));s.sensors[1].connections.signal='P1';assert.equal(validate(s).errors.length,0);const p=generatePrompt(s);assert.match(p,/10未満、かつ人感センサがON/);assert.match(p,/25個のLEDをすべて点灯/);assert.match(p,/10以上、または人感センサがOFF/);assert.match(p,/25個のLEDをすべて消灯/);assert.ok(!p.includes('【Teachable Machine】'));});
test('Classの大文字・空白・全角をJSON文字列のまま保持',()=>{const s=valid();s.ai={mode:'image',classes:' Cat1 \ncat1\n和猫\nアメショー',url:''};const p=generatePrompt(s);assert.ok(p.includes(JSON.stringify([' Cat1 ','cat1','和猫','アメショー'])));});
test('空行・空白だけ・完全同名のClassを拒否',()=>{for(const text of ['','C1\n','C1\n \nC2','C1\nC1']){const s=valid();s.ai={mode:'sound',classes:text,url:''};assert.ok(validate(s).errors.length,text);}});
test('任意のモデルURLは空欄可、不正形式は拒否、ポーズ対応は断定しない',()=>{const s=valid();s.ai={mode:'pose',classes:'立つ\n座る',url:''};assert.equal(validate(s).errors.length,0);assert.ok(validate(s).warnings.some(w=>w.message.includes('未確認')));s.ai.url='javascript:alert(1)';assert.ok(validate(s).errors.length);s.ai.url='https://teachablemachine.withgoogle.com/models/test_1/';assert.equal(validate(s).errors.length,0);});
test('未使用AIの古いClass入力を検証・出力しない',()=>{const s=valid();s.ai={mode:'none',classes:'C1\nC1',url:'bad'};assert.equal(validate(s).errors.length,0);assert.ok(!generatePrompt(s).includes('C1'));});
test('同種装置を複数追加可、独占端子の重複をS/A間でも検出',()=>{const s=valid();s.sensors=[makeItem('soil','s1'),makeItem('soil','s2')];s.actuators=[makeItem('pump','a1')];s.sensors[0].connections.signal='P0';s.sensors[1].connections.signal='P1';s.actuators[0].connections.signal='P0';assert.ok(validate(s).errors.some(e=>e.message.includes('重複')));s.actuators[0].connections.signal='P2';assert.equal(validate(s).errors.length,0);});
test('対応外端子とTRIG/ECHOの重複を拒否',()=>{const s=valid();s.sensors=[makeItem('distance','d')];s.sensors[0].connections={trig:'P0',echo:'P0'};assert.ok(validate(s).errors.some(e=>e.message.includes('重複')));s.sensors[0].connections.echo='P99';assert.ok(validate(s).errors.some(e=>e.message.includes('使えない')));});
test('重量センサはI2C配線だけを表示し、共有時に配線確認を促す',()=>{const s=valid();s.sensors=[makeItem('scale','s1'),makeItem('scale','s2')];assert.deepEqual(findDevice('scale').fields.map(f=>f.key),['scl','sda']);assert.equal(validate(s).errors.length,0);assert.ok(validate(s).warnings.some(w=>w.message.includes('共有')));});
test('復元・破損データ・不正なS/A分類を扱い、編集した指示文も保存',()=>{assert.equal(restoreState('{bad'),null);assert.equal(restoreState('{"version":2}'),null);const s=valid();s.prompt='編集した指示文';s.signature=inputSignature(s);const r=restoreState(JSON.stringify(s));assert.equal(r.prompt,s.prompt);assert.equal(r.signature,inputSignature(r));s.sensors=[makeItem('pump','bad')];assert.equal(restoreState(JSON.stringify(s)).sensors.length,0);});
test('確認事項と自動作成する変数を含め、実機条件を補完しない',()=>{const s=valid();s.sensors=[makeItem('scale','s')];const p=generatePrompt(s);assert.ok(p.includes('通信ラベル「weight」'));assert.ok(!p.includes('専用プログラム'));assert.ok(!p.includes('I2Cアドレス'));assert.ok(!p.includes('通信ラベルが未確認'));assert.ok(p.includes('必要な変数やリスト'));assert.ok(p.includes('通常のJavaScriptや外部APIを勝手に使用しない'));assert.ok(!p.includes('2秒'));});

test('おまかせと詳細モードで確認方針を分け、安全上の制約と自動変数作成を維持',()=>{
 const s=valid();s.actuators=[makeItem('servo','a')];s.actuators[0].connections.signal='P1';
 const auto=generatePrompt(s);s.promptMode='precise';const precise=generatePrompt(s);
 assert.match(auto,/質問よりコード生成を優先/);assert.match(auto,/合理的な初期値/);assert.match(auto,/採用した値を短く説明/);
 assert.match(auto,/安全上重要な条件.*推測しない/);assert.doesNotMatch(auto,/コード作成前に必要な確認質問をまとめ/);
 assert.match(precise,/コード作成前に必要な確認質問をまとめ/);
 for(const p of [auto,precise]){assert.match(p,/存在しないB2S命令・モデルURL・Class名・端子を創作しない/);assert.match(p,/「Scratchへ反映」で自動作成/);assert.match(p,/手動作成させない/);assert.match(p,/停止処理・連続動作防止・異常時/);}
});
test('旧保存のモードをおまかせへ移行し、旧指示文・重複内蔵装置・メモを削除しない',()=>{
 const s=valid();delete s.promptMode;s.sensors=[makeItem('light','l1'),makeItem('light','l2')];s.sensors[1].note='以前のメモ';s.prompt='以前に手直しした文章';
 s.signature=JSON.stringify([s.purpose,s.sensors,s.actuators,s.ai,s.behavior]);
 const r=restoreState(JSON.stringify(s));assert.equal(r.promptMode,'auto');assert.equal(r.sensors.length,2);assert.equal(r.sensors[1].note,'以前のメモ');assert.equal(r.prompt,s.prompt);assert.equal(r.signature,'');
 assert.equal(validate(r).warnings.filter(w=>w.kind==='duplicate').length,2);
 const corruptedMode=restoreState(JSON.stringify({...s,promptMode:{toString:null}}));assert.equal(corruptedMode.promptMode,'auto');assert.equal(corruptedMode.sensors.length,2);
});
test('新しいモードの保存・復元と変更時の生成文無効化',()=>{
 const s=valid();s.promptMode='precise';s.prompt=generatePrompt(s);s.signature=inputSignature(s);
 const r=restoreState(JSON.stringify(s));assert.equal(r.promptMode,'precise');assert.equal(r.signature,inputSignature(r));r.promptMode='auto';assert.notEqual(r.signature,inputSignature(r));
 r.promptMode='unknown';assert.ok(validate(r).errors.some(e=>e.target==='prompt-mode'));
});
test('端子競合を双方の装置へ関連付け、配線確認と入力問題を区別',()=>{
 const s=valid();s.sensors=[makeItem('pir','pir')];s.actuators=[makeItem('servo','servo')];s.sensors[0].connections.signal=s.actuators[0].connections.signal='P0';
 const r=validate(s),conflict=r.errors.find(e=>e.kind==='pin-conflict');assert.equal(conflict.target,'item-servo');assert.deepEqual(conflict.relatedTargets,['item-pir']);assert.ok(r.warnings.some(w=>w.kind==='wiring'));
});
test('防犯模型は指定値を保持し、モデルURLだけ必要時に確認、演出はおまかせ、実住宅を解錠しない',async()=>{
 const {securityState}=await import('./fixtures/security.mjs');
 for(const mode of ['auto','precise']){const s=securityState(mode),p=generatePrompt(s);assert.equal(validate(s).errors.length,0);
 for(const v of ['30未満','P0','P1','0度','180度','家の人','クロネコヤマト','怪しい人'])assert.ok(p.includes(v),v);
 assert.match(p,/モデルURL：未入力/);assert.doesNotMatch(p,/models\/[^\s]+/);assert.match(p,/模型・シミュレーション/);assert.match(p,/実際の住宅の鍵を自動解錠せず/);
 if(mode==='auto')assert.match(p,/調整値だけを理由に確認質問を並べない/);else assert.match(p,/コード作成前に必要な確認質問/);
 }
});

test('Grove Shieldの振動モータとポンプはそれぞれの対応端子だけを許可する',()=>{
 for(const [deviceId,allowed,rejected] of [['vibrator',['P14','P15','P16'],['P0','P1','P2']],['pump',['P0','P1','P2'],['P14','P15','P16']]]){
  for(const signal of [...allowed,...rejected]){const s=valid();s.actuators=[{...makeItem(deviceId,'a'),connections:{signal}}];assert.equal(validate(s).errors.length===0,allowed.includes(signal),deviceId+signal);}
 }
});
test('以前の重量センサ設定と指示文を復元しても、再生成前のコピーを許可しない',()=>{
 const s=valid();s.sensors=[makeItem('scale','s')];s.sensors[0].connections={address:'0x26',firmware:'未確認',dataLabel:'old'};s.sensors[0].note='花瓶を載せて重さを測る';s.prompt='以前の指示文';s.signature=JSON.stringify([s.purpose,s.sensors,s.actuators,s.ai,s.behavior,s.promptMode]);
 const r=restoreState(JSON.stringify(s));assert.deepEqual(r.sensors[0].connections,{});assert.equal(r.sensors[0].note,s.sensors[0].note);assert.equal(r.prompt,s.prompt);assert.equal(r.signature,'');assert.match(generatePrompt(r),/通信ラベル「weight」/);
});

test('水やりサンプルは指定端子と自動・手動給水、人がいる間だけの表示を保持する',()=>{
 const s=wateringSampleState();assert.equal(validate(s).errors.length,0);assert.equal(s.ai.mode,'none');
 assert.deepEqual(s.sensors.map(i=>[i.deviceId,i.connections.signal]),[['pir','P0'],['soil','P1'],['buttons',undefined]]);
 assert.deepEqual(s.actuators.map(i=>[i.deviceId,i.connections.signal]),[['pump','P2'],['led',undefined]]);
 const p=generatePrompt(s);for(const text of ['10％未満','1分間（60秒）','60mL','10秒間','10mL','Aボタン','ONのときだけ','0から100','OFFのときはLEDをすべて消灯','人がいなくても','重複して実行しない','校正値','次の自動給水を許可する条件'])assert.ok(p.includes(text),text);
 const r=restoreState(JSON.stringify(s));assert.equal(r.behavior,s.behavior);assert.deepEqual(r.sensors.map(i=>i.connections),s.sensors.map(i=>i.connections));
});
