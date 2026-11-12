import {findDevice,AI_MODES} from './data/devices.js';
export const PROMPT_MODES={auto:'AIにおまかせ',precise:'自分で細かく決める'};
export const promptMode=s=>typeof s.promptMode==='string'&&Object.hasOwn(PROMPT_MODES,s.promptMode)?s.promptMode:'auto';
export const STORAGE_KEY='b2s-prompt-maker-v1';
export const emptyState=()=>({version:1,promptMode:'auto',purpose:'',sensors:[],actuators:[],ai:{mode:'none',classes:'',url:''},behavior:'',prompt:'',signature:''});
export const inputSignature=s=>JSON.stringify(['device-settings-v2',s.purpose,s.sensors,s.actuators,s.ai,s.behavior,promptMode(s)]);
export const makeItem=(deviceId,id)=>({id,deviceId,connections:{},note:''});
export function sampleState(){
 const s=emptyState();
 s.purpose='夜間や暗い場所で人の動きを検知したときだけ、25個のLEDを点灯して周囲に知らせる防犯ライトを作りたい。明るいときや人がいないときは消灯する。';
 s.sensors=[makeItem('light','sample-light'),makeItem('pir','sample-pir')];
 s.sensors[0].note='まわりの明るさを調べる。';
 s.sensors[1].note='人の動きを検知する。';
 s.actuators=[makeItem('led','sample-led')];
 s.behavior='明るさセンサの数値が10未満、かつ人感センサがONのときだけ、micro:bitの25個のLEDをすべて点灯する。明るさセンサの数値が10以上、または人感センサがOFFになったら、25個のLEDをすべて消灯する。条件を繰り返し確認し、両方の条件を満たしたら再び点灯する。';
 return s;
}
export function wateringSampleState(){
 const s=emptyState();
 s.purpose='留守中も観葉植物の土の水分量を見守り、乾いたら自動で水やりする装置を作りたい。人がいるときだけLEDに水分量を表示して無駄な電力消費を抑え、Aボタンから手動でも給水できるようにしたい。';
 s.sensors=[makeItem('pir','watering-pir'),makeItem('soil','watering-soil'),makeItem('buttons','watering-buttons')];
 s.sensors[0].connections.signal='P0';s.sensors[0].note='人がいるときだけLEDディスプレイに水分量を表示するために使う。';
 s.sensors[1].connections.signal='P1';s.sensors[1].note='観葉植物の土に挿して、水分量を常に計測する。水分量は0〜100％で扱う。';
 s.sensors[2].note='Aボタンで手動給水する。';
 s.actuators=[makeItem('pump','watering-pump'),makeItem('led','watering-led')];
 s.actuators[0].connections.signal='P2';s.actuators[0].note='1分間の作動で60mL、10秒間の作動で10mLを給水する想定。実際の吐出量は実機で確認する。';
 s.behavior='土壌水分センサで常に水分量を計測する。水分量が10％未満になったら、デジタルマイクロポンプを1分間（60秒）作動させて60mL給水し、停止する。\n人感センサがONのときだけ、LEDディスプレイに現在の水分量を0から100の数値で表示する。人感センサがOFFのときはLEDをすべて消灯し、無駄な電力消費を抑える。人がいなくても水分量の計測と自動給水は続ける。\nAボタンを1回押すと、ポンプを10秒間作動させて10mL手動給水し、停止する。\n自動給水と手動給水を重複して実行しない。給水中もセンサの計測と人の有無による表示切り替えを続ける。水分量が10％未満のままの場合に次の自動給水を許可する条件と、給水中にAボタンを押した場合の扱いは、連続給水を防ぐためコード作成前に確認する。土壌水分センサの測定値を0〜100％へ換算するための乾燥時・湿潤時の校正値は実測して確認する。';
 return s;
}
export function restoreState(raw){
 try{const x=JSON.parse(raw);if(x?.version!==1||!Array.isArray(x.sensors)||!Array.isArray(x.actuators))return null;
 const text=v=>typeof v==='string'?v:'';const s=emptyState();
 const items=(arr,group)=>arr.filter(i=>i&&findDevice(i.deviceId)?.group===group&&typeof i.id==='string').map((i,index)=>({id:group+'-'+index,deviceId:i.deviceId,connections:Object.fromEntries(Object.entries(i.connections??{}).filter(([k,v])=>findDevice(i.deviceId).fields.some(f=>f.key===k)&&typeof v==='string')),note:text(i.note)}));
 s.promptMode=promptMode(x);s.sensors=items(x.sensors,'S');s.actuators=items(x.actuators,'A');s.purpose=text(x.purpose);s.behavior=text(x.behavior);s.ai={mode:Object.hasOwn(AI_MODES,x.ai?.mode)?x.ai.mode:'none',classes:text(x.ai?.classes),url:text(x.ai?.url)};s.prompt=text(x.prompt);
 // IDs are internal and may change while restoring. Keep the edited prompt only when inputs match.
 s.signature=typeof x.promptMode==='string'&&Object.hasOwn(PROMPT_MODES,x.promptMode)&&x.signature===inputSignature(x)?inputSignature(s):'';return s;
 }catch{return null;}
}
export function validate(s){
 const errors=[],warnings=[],used=new Map();
 const add=(list,message,target,kind='input',relatedTargets=[])=>list.push({message,target,kind,relatedTargets});
 if(s.promptMode!==undefined&&(typeof s.promptMode!=='string'||!Object.hasOwn(PROMPT_MODES,s.promptMode)))add(errors,'生成モードを選び直してください。','prompt-mode');
 if(!s.purpose.trim())add(errors,'① 何を作りたいかを書こう。','purpose');
 if(!s.behavior.trim())add(errors,'⑤ どんなときに、何をするかを書こう。','behavior');
 for(const [key,group]of [['sensors','S'],['actuators','A']])for(const [index,item]of s[key].entries()){
  const d=findDevice(item.deviceId),target='item-'+item.id;
  if(!d||d.group!==group){add(errors,'装置の種類を選び直してください。',target);continue;}
  const name=`${group}${index+1} ${d.name}`;
  if(d.status!=='source')add(warnings,`${name}：${d.support}`,target,d.status==='unverified'?'support':'wiring');
  if(d.builtIn&&s[key].filter(i=>i.deviceId===d.id).length>1)add(warnings,`${name}：同じ内蔵装置が重複登録されています。不要な登録を外して整理してください。`,target,'duplicate');
  const localPins=new Set();
  for(const f of d.fields){const value=f.kind==='fixed'?f.value:item.connections[f.key]??'';
   if(f.required&&!value.trim()){add(errors,`${name}の「${f.label}」を選ぶ・入力しよう。`,target);continue;}
   if(f.kind==='pin'&&value&&!f.allowed.includes(value))add(errors,`${name}の「${f.label}」に使えない端子が指定されています。`,target);
   if(f.kind==='choice'&&value&&!f.options.includes(value))add(errors,`${name}の準備状況を選び直してください。`,target);
   if(f.kind==='address'&&value&&!/^0x[0-7][0-9a-f]$/i.test(value))add(errors,`${name}のI2Cアドレスは0xで始まる2桁の16進数で入力してください。`,target);
   if((f.kind==='pin'||f.kind==='fixed')&&value){
    if(localPins.has(value))add(errors,`${name}で${value}が重複しています。役割ごとに別の端子を選ぼう。`,target,'pin-conflict');localPins.add(value);
    const peers=used.get(value)??[];for(const peer of peers){if(f.sharing==='i2c'&&peer.sharing==='i2c')add(warnings,`${value}はI2Cで共有しています。装置のアドレス・電源・配線が共有可能か先生と確認しよう。`,target,'wiring');else add(errors,`${value}が「${peer.name}」と「${name}」で重複しています。`,target,'pin-conflict',[peer.target]);}peers.push({name,sharing:f.sharing,target});used.set(value,peers);
   }
  }

 }
 if(!Object.hasOwn(AI_MODES,s.ai.mode))add(errors,'③ AIの種類を選び直そう。','ai-mode');
 if(s.ai.mode!=='none'){
  const classes=s.ai.classes.split(/\r?\n/);
  if(classes.some(c=>!c.trim()))add(errors,'③ Class名は1行に1つ。空の行にも名前を入れるか、その行を消そう。','classes');
  if(new Set(classes).size!==classes.length)add(errors,'③ 同じClass名が重複しています。','classes');
  if(s.ai.url){try{const u=new URL(s.ai.url);if(u.protocol!=='https:'||u.hostname!=='teachablemachine.withgoogle.com'||!/^\/models\/[^/]+\/?$/.test(u.pathname)||u.search||u.hash)throw Error();}catch{add(errors,'③ モデルURLはTeachable Machineの共有URL（https://teachablemachine.withgoogle.com/models/…/）を入力しよう。','model-url');}}
  if(!s.ai.url)add(warnings,'モデルURLは未入力です。画像・音声認識などで必要なら、実際の共有URLを確認してください。','model-url','missing-model');
  if(s.ai.mode==='pose')add(warnings,AI_MODES.pose.support,'ai-mode','support');
 }
 return {errors,warnings:[...new Map(warnings.map(w=>[w.message,w])).values()]};
}
export function generatePrompt(s){
 const result=validate(s);if(result.errors.length)throw new Error(result.errors.map(e=>e.message).join('\n'));
 const mode=promptMode(s);
 const out=['Block2Script用プログラム作成のお願い',`生成モード：${PROMPT_MODES[mode]}`,'通常のJavaScriptや外部APIを勝手に使用しないでください。現在のB2S命令と読み込み済み拡張・知識資料に基づき、存在する命令だけで作成してください。','','【目的】',s.purpose];
 for(const [key,title,group]of [['sensors','S：使用するセンサ','S'],['actuators','A：使用するアクチュエータ','A']])if(s[key].length){
  out.push('',`【${title}】`);
  s[key].forEach((item,i)=>{
   const d=findDevice(item.deviceId);out.push(`${group}${i+1}：${d.name}（${d.builtIn?'内蔵・外付け端子なし':d.connection}）`);
   for(const f of d.fields)out.push(`  ${f.label}：${(f.kind==='fixed'?f.value:item.connections[f.key])||'未確認（補完しないでください）'}`);
   if(d.note)out.push('  注意：'+d.note);
   if(item.note)out.push('  メモ：'+item.note);
  });
 }
 if(s.ai.mode!=='none')out.push('','【Teachable Machine】',`種類：${AI_MODES[s.ai.mode].name}`,'Class名（JSONの各文字列を大小文字・前後の空白も含めて正確に使用）：',JSON.stringify(s.ai.classes.split(/\r?\n/)),`モデルURL：${s.ai.url||'未入力。認識の実行に必要なら、実際の共有URLだけを確認してください。架空のURLで実行可能とはしないでください。'}`);
 out.push('','【動作条件】',s.behavior);
 const notices=result.warnings.filter(w=>w.kind!=='wiring'&&w.kind!=='missing-model');
 if(notices.length)out.push('','【個別の確認事項】',...notices.map(w=>'・'+w.message));
 if(result.warnings.some(w=>w.kind==='wiring'))out.push('外付け装置の配線・電源・実機動作は先生と確認してください。MakeCode対応だけでB2S対応と判断しないでください。');
 out.push('','【Gemへの進め方】','生徒が指定した装置構成・端子・Class名・モデルURL・数値・動作条件を尊重し、勝手に追加・変更しないでください。存在しないB2S命令・モデルURL・Class名・端子を創作しないでください。');
 if(mode==='auto')out.push(
  '原則として質問よりコード生成を優先してください。未指定の危険のない演出・効果音の高さ・画面表示・表示や演出の待機時間には合理的な初期値を提案・採用し、採用した値を短く説明してください。これらの調整値だけを理由に確認質問を並べないでください。',
  '端子番号・実際のモデルURL・Class名・配線方式・電源仕様・安全上重要な条件（実機の停止時間、しきい値、再動作条件を含む）は推測しないでください。確認は実現に不可欠な不足情報だけに絞り、進められる部分のコードを先に示してください。'
 );else out.push('未指定の動作時間・しきい値・停止条件・再動作条件は推測で決めず、コード作成前に必要な確認質問をまとめてください。');
 if(s.actuators.some(i=>['servo','pump','vibrator'].includes(i.deviceId))||/鍵|施錠|解錠/.test(s.purpose+s.behavior))out.push(
  '鍵の開閉・ポンプ・モータの制御では、停止処理・連続動作防止・異常時の扱いを検討してください。安全性を確認できない部分は、実機の完成コードではなく模型・シミュレーション向けのコードとして明示してください。画像分類だけで実際の住宅の鍵を自動解錠せず、サーボで鍵の模型を動かす試作として扱ってください。');
 out.push(
  '必要な変数やリストはB2Sコード内で参照し、「Scratchへ反映」で自動作成される前提で生成してください。生徒に変数・リストを手動作成させないでください。',
  '必要な拡張機能、Block2Scriptコード、採用した初期値・確認が必要な点、動作確認の順で簡潔に説明してください。'
 );
 return out.join('\n');
}
