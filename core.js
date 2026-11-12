import {findDevice,AI_MODES} from './data/devices.js';
export const STORAGE_KEY='b2s-prompt-maker-v1';
export const emptyState=()=>({version:1,purpose:'',sensors:[],actuators:[],ai:{mode:'none',classes:'',url:''},behavior:'',prompt:'',signature:''});
export const inputSignature=s=>JSON.stringify([s.purpose,s.sensors,s.actuators,s.ai,s.behavior]);
export const makeItem=(deviceId,id)=>({id,deviceId,connections:{},note:''});
export function sampleState(){const s=emptyState();s.purpose='猫の種類に応じて自動で水を出す装置';s.sensors=[makeItem('scale','sample-scale')];s.sensors[0].connections.firmware='未確認';s.sensors[0].connections.address='0x26';s.actuators=[makeItem('pump','sample-pump')];s.ai={mode:'image',classes:'C1\nC2\nD1\nD2\nnone',url:''};s.behavior='猫の接近を検知し、画像認識で種類を識別する。C1で、重量センサの値が１０ｇ以下の場合のみデジタルマイクロポンプで給水する。再検知による連続給水を防止する。\n接近を検知する方法、ポンプを動かす時間、停止条件、次に給水してよい条件は、先生と相談して決めたい。';return s;}
export function restoreState(raw){
 try{const x=JSON.parse(raw);if(x?.version!==1||!Array.isArray(x.sensors)||!Array.isArray(x.actuators))return null;
 const text=v=>typeof v==='string'?v:'';const s=emptyState();
 const items=(arr,group)=>arr.filter(i=>i&&findDevice(i.deviceId)?.group===group&&typeof i.id==='string').map((i,index)=>({id:group+'-'+index,deviceId:i.deviceId,connections:Object.fromEntries(Object.entries(i.connections??{}).filter(([k,v])=>findDevice(i.deviceId).fields.some(f=>f.key===k)&&typeof v==='string')),note:text(i.note)}));
 s.sensors=items(x.sensors,'S');s.actuators=items(x.actuators,'A');s.purpose=text(x.purpose);s.behavior=text(x.behavior);s.ai={mode:Object.hasOwn(AI_MODES,x.ai?.mode)?x.ai.mode:'none',classes:text(x.ai?.classes),url:text(x.ai?.url)};s.prompt=text(x.prompt);
 // IDs are internal and may change while restoring. Keep the edited prompt only when inputs match.
 s.signature=x.signature===inputSignature(x)?inputSignature(s):'';return s;
 }catch{return null;}
}
export function validate(s){
 const errors=[],warnings=[],used=new Map();
 const add=(list,message,target)=>list.push({message,target});
 if(!s.purpose.trim())add(errors,'① 何を作りたいかを書こう。','purpose');
 if(!s.behavior.trim())add(errors,'⑤ どんなときに、何をするかを書こう。','behavior');
 for(const [key,group]of [['sensors','S'],['actuators','A']])for(const [index,item]of s[key].entries()){
  const d=findDevice(item.deviceId),target='item-'+item.id;
  if(!d||d.group!==group){add(errors,'装置の種類を選び直してください。',target);continue;}
  const name=`${group}${index+1} ${d.name}`;
  if(d.status!=='source')add(warnings,`${name}：${d.support}`,target);
  const localPins=new Set();
  for(const f of d.fields){const value=f.kind==='fixed'?f.value:item.connections[f.key]??'';
   if(f.required&&!value.trim()){add(errors,`${name}の「${f.label}」を選ぶ・入力しよう。`,target);continue;}
   if(f.kind==='pin'&&value&&!f.allowed.includes(value))add(errors,`${name}の「${f.label}」に使えない端子が指定されています。`,target);
   if(f.kind==='choice'&&value&&!f.options.includes(value))add(errors,`${name}の準備状況を選び直してください。`,target);
   if(f.kind==='address'&&value&&!/^0x[0-7][0-9a-f]$/i.test(value))add(errors,`${name}のI2Cアドレスは0xで始まる2桁の16進数で入力してください。`,target);
   if((f.kind==='pin'||f.kind==='fixed')&&value){
    if(localPins.has(value))add(errors,`${name}で${value}が重複しています。役割ごとに別の端子を選ぼう。`,target);localPins.add(value);
    const peers=used.get(value)??[];for(const peer of peers){if(f.sharing==='i2c'&&peer.sharing==='i2c')add(warnings,`${value}はI2Cで共有しています。装置のアドレス・電源・配線が共有可能か先生と確認しよう。`,target);else add(errors,`${value}が「${peer.name}」と「${name}」で重複しています。`,target);}peers.push({name,sharing:f.sharing});used.set(value,peers);
   }
  }
  if(d.id==='scale'){
   if(item.connections.firmware!=='用意済み'||!item.connections.dataLabel?.trim())add(warnings,`${name}：専用プログラムと重さの通信ラベルが未確認です。Gemにも確認を求めます。`,target);
   const same=s.sensors.filter(i=>i.deviceId==='scale'&&i.id!==item.id&&i.connections.address&&i.connections.address.toLowerCase()===item.connections.address?.toLowerCase());
   if(same.length)add(errors,`${name}：同じI2Cアドレスの重量センサがあります。共有できるか配線を確認してください。`,target);
  }
 }
 if(!Object.hasOwn(AI_MODES,s.ai.mode))add(errors,'④ AIの種類を選び直そう。','ai-mode');
 if(s.ai.mode!=='none'){
  const classes=s.ai.classes.split(/\r?\n/);
  if(classes.some(c=>!c.trim()))add(errors,'④ Class名は1行に1つ。空の行にも名前を入れるか、その行を消そう。','classes');
  if(new Set(classes).size!==classes.length)add(errors,'④ 同じClass名が重複しています。','classes');
  if(s.ai.url){try{const u=new URL(s.ai.url);if(u.protocol!=='https:'||u.hostname!=='teachablemachine.withgoogle.com'||!/^\/models\/[^/]+\/?$/.test(u.pathname)||u.search||u.hash)throw Error();}catch{add(errors,'④ モデルURLはTeachable Machineの共有URL（https://teachablemachine.withgoogle.com/models/…/）を入力しよう。','model-url');}}
  if(!s.ai.url)add(warnings,'モデルURLは未入力です。必要な設定をGemに確認してもらいます。','model-url');
  if(s.ai.mode==='pose')add(warnings,AI_MODES.pose.support,'ai-mode');
 }
 return {errors,warnings:[...new Map(warnings.map(w=>[w.message,w])).values()]};
}
export function generatePrompt(s){
 const result=validate(s);if(result.errors.length)throw new Error(result.errors.map(e=>e.message).join('\n'));
 const out=['Block2Script用プログラム作成のお願い','','以下の装置構成と動作条件に基づいて、現在使用しているBlock2Script環境で実行可能なプログラムを作成してください。通常のJavaScriptや外部APIを勝手に使用しないでください。現在ロードされている命令や拡張機能で対応できない場合は、その内容を説明してください。必要な変数やリストがある場合は、作成前の準備として名前と用途を明示してください。','','【作りたい装置】',s.purpose];
 for(const [key,title,group]of [['sensors','S：使用するセンサ','S'],['actuators','A：使用するアクチュエータ','A']])if(s[key].length){out.push('',`【${title}】`);s[key].forEach((item,i)=>{const d=findDevice(item.deviceId);out.push(`${group}${i+1}：${d.name}`,`  接続方式：${d.connection}`);if(d.builtIn)out.push('  内蔵のため外付け端子の指定なし');for(const f of d.fields){const value=f.kind==='fixed'?f.value:item.connections[f.key];out.push(`  ${f.label}：${value||'未確認（補完しないでください）'}`);}out.push(`  B2S対応状況：${d.support}`);if(d.note)out.push(`  注意：${d.note}`);if(item.note)out.push('  自分のメモ：'+item.note);});}
 if(s.ai.mode!=='none'){out.push('','【Teachable Machine】',`種類：${AI_MODES[s.ai.mode].name}`,'Class名（次のJSON配列の各文字列を、大文字・小文字・前後の空白も含めてそのまま使ってください）：',JSON.stringify(s.ai.classes.split(/\r?\n/)),`モデルURL：${s.ai.url||'未入力。必要な場合は設定方法を説明してください。'}`,`対応状況：${AI_MODES[s.ai.mode].support}`);}
 out.push('','【実現したい動作】',s.behavior);
 if(result.warnings.length)out.push('','【コード作成前に確認したいこと】',...result.warnings.map(w=>'・'+w.message));
 out.push('','【作成時のお願い】','・記載のない装置・端子・Class名・動作時間・しきい値・再動作条件を推測で決めないでください。不足する情報があれば、コードの前に質問してください。','・装置の対応は、現在のBlock2Scriptの命令仕様と読み込み済み拡張で確認してください。MakeCodeのブロックをそのままB2Sの命令と扱わないでください。','・準備する拡張機能、変数・リスト、貼り付けるBlock2Script Script、動作確認の順で説明してください。');
 return out.join('\n');
}
