import {DEVICES,AI_MODES,findDevice} from './data/devices.js';
import {STORAGE_KEY,emptyState,sampleState,restoreState,makeItem,validate,generatePrompt,inputSignature} from './core.js';
const imagePath=id=>`./assets/devices/${id}.svg`;
const $=id=>document.getElementById(id);
let state=emptyState(),saveTimer,storageAvailable=true;
let activeStep='step1';
const editing={sensors:null,actuators:null};
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const restored=restoreState(saved);if(restored){state=restored;$('save-status').textContent='前回の入力を復元しました';}else $('save-status').textContent='保存内容を読み取れません。新しく入力できます。';}}catch{storageAvailable=false;$('save-status').textContent='このブラウザでは保存できません。再読み込みに注意。';}
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;$('save-status').textContent='このブラウザに保存しました';}catch{storageAvailable=false;$('save-status').textContent='保存できません。再読み込み前に指示文をコピーしよう。';}},200);}
function changed(){save();updateResult();renderEquipment();$('action-status').textContent='';$('validation').hidden=true;for(const node of document.querySelectorAll('[aria-invalid]'))node.removeAttribute('aria-invalid');}
function updateResult(){const stale=!!state.prompt&&state.signature!==inputSignature(state);$('result').hidden=!state.prompt&&!state.signature;$('stale').hidden=!stale;$('copy').disabled=stale||!state.prompt.trim();}
function fillChoices(id,group){const select=$(id);select.replaceChildren(el('option',null,'装置を選ぼう'));select.firstChild.value='';for(const [builtIn,label]of [[true,'micro:bit内蔵'],[false,'外付け']]){const optgroup=el('optgroup');optgroup.label=label;for(const d of DEVICES.filter(d=>d.group===group&&d.builtIn===builtIn)){const option=el('option',null,d.name+(d.status==='unverified'?'〈対応要確認〉':''));option.value=d.id;optgroup.append(option);}select.append(optgroup);}}
function deviceImage(d,className=''){
 const img=el('img',className);
 img.src=imagePath(d.id);
 img.alt=d.name+'の'+(d.builtIn?'機能イラスト':'参考画像');
 img.width=280;img.height=190;img.loading='lazy';
 return img;
}
function renderCatalog(key,group){
 const kind=group==='S'?'sensor':'actuator',catalog=$(kind+'-catalog');
 catalog.replaceChildren();
 for(const d of DEVICES.filter(d=>d.group===group)){
  const tile=el('article','device-tile');tile.dataset.deviceId=d.id;
  const button=el('button','device-pick');button.type='button';button.dataset.deviceId=d.id;
  const n=state[key].filter(i=>i.deviceId===d.id).length;
  const builtInLabel=['touch','microphone','speaker'].includes(d.id)?'micro:bit V2内蔵':'micro:bit内蔵';
  button.setAttribute('aria-label',d.name+'を追加');
  button.classList.toggle('selected',n>0);
  button.append(deviceImage(d),el('span','tile-meta',d.builtIn?builtInLabel:'外付け'),
   el('strong','tile-name',d.name),el('span','tile-description',d.description),
   el('span','tile-add',n?'✓ '+n+'個選択中 · もう1個追加':'＋ この装置を追加'));
  button.addEventListener('click',()=>addDevice(d.id,key,group,false));
  tile.append(button);
  if(!d.builtIn){
   const notice=d.status==='unverified'?'B2Sで距離を得る手順は未確認':d.id==='scale'?'専用プログラム・通信ラベルを確認':'配線・電源を先生と確認';
   tile.append(el('p','tile-warning',notice));
  }
  const guide=el('a','tile-guide','装置ガイドで詳しく見る ↗');
  guide.href='https://playa2021git.github.io/reinvent-device-guide/';
  guide.target='_blank';guide.rel='noopener noreferrer';guide.setAttribute('aria-label',d.name+'を装置ガイドで詳しく見る（別タブ）');tile.append(guide);
  if(n){
   const settings=el('a','tile-settings','接続・メモを設定 ↓');
   settings.href='#item-'+state[key].find(i=>i.deviceId===d.id).id;
   settings.addEventListener('click',e=>{e.preventDefault();editDevice(key,state[key].find(i=>i.deviceId===d.id).id);});
   settings.setAttribute('aria-label',d.name+'の接続・メモを設定');
   tile.append(settings);
  }
  catalog.append(tile);
 }
}
function addDevice(deviceId,key,group,focus=true){
 const item=makeItem(deviceId,crypto.randomUUID());
 state[key].push(item);editing[key]=item.id;renderList(key,group);changed();animateEquip(deviceId,item.id);
 const kind=group==='S'?'sensor':'actuator';
 $(kind+'-feedback').textContent=findDevice(deviceId).name+'を追加しました。中央の設定で接続を確認しよう。';
 if(focus)$('item-'+item.id).focus();
 else document.querySelector(`#${kind}-catalog button[data-device-id="${deviceId}"]`).focus();
}
function renderList(key,group){const list=$(key==='sensors'?'sensor-list':'actuator-list');renderCatalog(key,group);list.replaceChildren();$(key==='sensors'?'sensor-count':'actuator-count').textContent=state[key].length+'個';if(!state[key].some(i=>i.id===editing[key]))editing[key]=state[key][0]?.id??null;
 list.hidden=!editing[key];
 state[key].forEach((item,index)=>{const d=findDevice(item.deviceId);const article=el('article','device-item');article.id='item-'+item.id;article.tabIndex=-1;article.hidden=item.id!==editing[key];const top=el('div','device-top');const name=el('div','device-name');name.append(el('span','device-tag',group+(index+1)),document.createTextNode(d.name));const close=el('button','close-editor','閉じる');close.type='button';close.addEventListener('click',()=>{list.hidden=true;document.querySelector(`button.device-pick[data-device-id="${d.id}"]`).focus();});const remove=el('button','remove','削除');remove.type='button';remove.setAttribute('aria-label',`${group}${index+1} ${d.name}を削除`);remove.addEventListener('click',()=>{state[key]=state[key].filter(i=>i.id!==item.id);renderList(key,group);changed();document.querySelector(`#${group==='S'?'sensor':'actuator'}-catalog button[data-device-id="${d.id}"]`).focus();});top.append(deviceImage(d,'selected-thumbnail'),name,close,remove);article.append(top,el('p','device-description',d.description),el('span',d.status==='source'?'badge':'badge warning',d.builtIn?'内蔵・外付け端子なし':d.status==='unverified'?'B2S対応は要確認':d.id==='scale'?'専用プログラムが必要':'配線・電源を確認'));
 if(d.fields.length){const fields=el('div','connection-fields');for(const f of d.fields){const wrap=el('div'),id=`${item.id}-${f.key}`,label=el('label',null,f.label+(f.required?' *':''));label.htmlFor=id;let input;
  if(f.kind==='pin'||f.kind==='choice'){input=el('select');const blank=el('option',null,'選んでください');blank.value='';input.append(blank);for(const value of f.allowed??f.options){const option=el('option',null,value);option.value=value;input.append(option);}}
  else{input=el('input');input.type='text';input.placeholder=f.placeholder??(f.kind==='address'?'例：0x26':'');input.spellcheck=false;}
  input.id=id;input.value=f.kind==='fixed'?f.value:item.connections[f.key]??'';
  if(f.kind==='fixed'){input.readOnly=true;input.setAttribute('aria-label',f.label+'：micro:bit標準I2Cの'+f.value);}
  else{if(f.required)input.required=true;input.addEventListener('input',()=>{item.connections[f.key]=input.value;changed();});}
  wrap.append(label,input);fields.append(wrap);
 }article.append(fields);}
 if(d.id==='speaker')article.append(el('p','device-note','図は音を出す働きのイメージです。接続はmicro:bit V2内蔵スピーカーを使います（外付け端子なし）。'));
 if(d.note)article.append(el('p','device-note',d.note));const memoId=item.id+'-note',memoLabel=el('label','memo-label','この装置のメモ（分かれば）');memoLabel.htmlFor=memoId;const memo=el('input','device-memo');memo.type='text';memo.id=memoId;memo.placeholder='例：水皿の重さを測る。先生と配線を確認済み。';memo.value=item.note;memo.addEventListener('input',()=>{item.note=memo.value;changed();});article.append(memoLabel,memo);list.append(article);
 });
}
function renderAI(){const mode=state.ai.mode;$('ai-fields').hidden=mode==='none';$('ai-support').textContent=AI_MODES[mode]?.support??'';$('class-count').textContent=(state.ai.classes?state.ai.classes.split(/\r?\n/).filter(c=>c.trim()).length:0)+'クラス';for(const input of document.querySelectorAll('[name=ai-mode]'))input.checked=input.value===mode;}
function render(){fillChoices('sensor-choice','S');fillChoices('actuator-choice','A');$('purpose').value=state.purpose;$('behavior').value=state.behavior;$('classes').value=state.ai.classes;$('model-url').value=state.ai.url;$('prompt').value=state.prompt;renderList('sensors','S');renderList('actuators','A');renderAI();updateResult();renderEquipment();}
for(const [id,key]of [['purpose','purpose'],['behavior','behavior']])$(id).addEventListener('input',()=>{state[key]=$(id).value;changed();});
for(const [id,key]of [['classes','classes'],['model-url','url']])$(id).addEventListener('input',()=>{state.ai[key]=$(id).value;renderAI();changed();});
for(const radio of document.querySelectorAll('[name=ai-mode]'))radio.addEventListener('change',()=>{state.ai.mode=radio.value;renderAI();changed();});
for(const [button,select,key,group]of [['add-sensor','sensor-choice','sensors','S'],['add-actuator','actuator-choice','actuators','A']])$(button).addEventListener('click',()=>{const deviceId=$(select).value;if(!deviceId){$(select).focus();$('action-status').textContent='追加する装置を選んでから「追加」を押そう。';return;}addDevice(deviceId,key,group);});
$('sample').addEventListener('click',()=>{if((state.purpose||state.sensors.length||state.actuators.length||state.behavior||state.ai.mode!=='none')&&!confirm('今の入力を猫の給水サンプルに置き換えますか？'))return;state=sampleState();editing.sensors='sample-scale';editing.actuators='sample-pump';render();goStep('step1',false);changed();$('action-status').textContent='サンプルを読み込みました。ポンプの端子と未確認の条件は、自分の装置に合わせて入力しよう。';$('purpose').focus();});
$('reset').addEventListener('click',()=>{if(!confirm('このブラウザに保存した入力と指示文を消しますか？'))return;clearTimeout(saveTimer);state=emptyState();render();goStep('step1',false);$('validation').hidden=true;try{localStorage.removeItem(STORAGE_KEY);$('save-status').textContent='保存した入力を消しました';}catch{$('save-status').textContent='保存内容を消せませんでした。ブラウザの設定を確認しよう。';}$('action-status').textContent='入力を消しました。新しいアイデアを書いてみよう。';$('purpose').focus();});
function showIssues(result){const container=$('validation');container.replaceChildren();for(const [items,title,warning]of [[result.errors,'ここを確認してから、もう一度つくろう',false],[result.warnings,'先生やGemに確認すること（指示文にも入ります）',true]]){if(!items.length)continue;const box=el('div',warning?'issues warning':'issues'),ul=el('ul');box.append(el('p',null,title));for(const issue of items){const li=el('li'),link=el('a',null,issue.message);link.href='#'+issue.target;link.addEventListener('click',e=>{e.preventDefault();const target=issue.target==='ai-mode'?document.querySelector('[name=ai-mode]:checked'):$(issue.target);if(target)revealTarget(target);});li.append(link);ul.append(li);if(!warning){const node=$(issue.target);if(node)node.setAttribute('aria-invalid','true');}}box.append(ul);container.append(box);}container.hidden=!result.errors.length&&!result.warnings.length;}
$('builder').addEventListener('submit',e=>{e.preventDefault();clearTimeout(saveTimer);const result=validate(state);showIssues(result);if(result.errors.length){$('action-status').textContent=`まだ指示文をつくれません。${result.errors.length}件の入力を確認しよう。`;$('validation').focus();return;}if(state.prompt&&state.signature===inputSignature(state)&&$('prompt').value!==generatePrompt(state)&&!confirm('手直しした指示文を、入力からつくり直しますか？'))return;state.prompt=generatePrompt(state);state.signature=inputSignature(state);$('prompt').value=state.prompt;updateResult();save();$('action-status').textContent=result.warnings.length?'確認が必要なことを含めて、指示文をつくりました。内容を読んでからコピーしよう。':'指示文をつくりました。内容を読んで、専用Gemへコピーしよう。';$('result').scrollIntoView({block:'nearest'});});
$('prompt').addEventListener('input',()=>{state.prompt=$('prompt').value;save();updateResult();$('action-status').textContent='指示文を手直ししています。';});
$('copy').addEventListener('click',async()=>{if(state.signature!==inputSignature(state)||!state.prompt.trim())return;try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(state.prompt);$('action-status').textContent='コピーしました！ 専用Gemに貼り付けて送信しよう。';$('copy').textContent='✓ コピーしました';setTimeout(()=>{$('copy').textContent='指示文をコピー';},2200);}catch{$('prompt').focus();$('prompt').select();$('action-status').textContent='自動でコピーできませんでした。指示文を選択しました。Ctrl＋C（スマートフォンは長押し）でコピーしよう。';}});
window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);try{if(state.purpose||state.behavior||state.sensors.length||state.actuators.length||state.prompt||state.ai.mode!=='none')localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}});
// Workshop navigation and equipment are views of the same v1 state.
function goStep(id,focus=true){
 if(!/^step[1-6]$/.test(id))return;
 activeStep=id;
 $('equipment').classList.remove('is-open');$('equipment-toggle').setAttribute('aria-expanded','false');$('equipment-toggle').textContent='発明セットを開く ↓';
 for(const panel of document.querySelectorAll('#builder > .card'))panel.hidden=panel.id!==id;
 for(const link of document.querySelectorAll('.step-nav nav a')){
  const active=link.hash==='#'+id;link.classList.toggle('active',active);
  if(active)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');
 }
 const step=Number(id.slice(4));$('previous-step').disabled=step===1;$('next-step').hidden=step===6;
 $('step-progress').textContent=step+' / 6';
 history.replaceState(null,'','#'+id);
 const panel=$(id);panel.classList.remove('panel-enter');void panel.offsetWidth;panel.classList.add('panel-enter');
 if(focus){const heading=panel.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function editDevice(key,id){
 editing[key]=id;renderList(key,key==='sensors'?'S':'A');
 goStep(key==='sensors'?'step2':'step3');
 $('equipment').classList.remove('is-open');$('equipment-toggle').setAttribute('aria-expanded','false');
 $('equipment-toggle').textContent='発明セットを開く ↓';
 const article=$('item-'+id);article.focus();
}
function revealTarget(target){
 const article=target.closest('.device-item');
 if(article){const key=state.sensors.some(i=>'item-'+i.id===article.id)?'sensors':'actuators';editDevice(key,article.id.slice(5));return;}
 const panel=target.closest('#builder > .card');if(panel)goStep(panel.id,false);
 target.scrollIntoView({block:'center'});target.focus();
}
function removeEquipment(key,id){
 const item=state[key].find(i=>i.id===id);state[key]=state[key].filter(i=>i.id!==id);
 renderList(key,key==='sensors'?'S':'A');changed();
 $('equipment-message').textContent=findDevice(item.deviceId).name+'を外しました。';
 const next=document.querySelector('#equipped-'+key+' button')??$('review-settings');next.focus({preventScroll:true});
}
function renderEquipment(){
 const result=validate(state);
 $('purpose-summary').textContent=state.purpose||'まだ決まっていません';
 $('behavior-summary').textContent=state.behavior||'どんなときに、どう動く？';
 $('equipment-count').textContent=(state.sensors.length+state.actuators.length)+'個';
 const overview=$('equipment-overview');overview.replaceChildren();
 for(const [key,label] of [['sensors','S'],['actuators','A']]){
  const row=el('div','overview-row'),text=state[key].map(item=>{
   const d=findDevice(item.deviceId),pins=d.fields.filter(f=>f.kind==='pin'||f.kind==='fixed').map(f=>f.kind==='fixed'?f.value:item.connections[f.key]||'未設定');
   return d.name+'（'+(d.builtIn?'内蔵':pins.join('・'))+'）';
  }).join(' / ')||'未選択';
  row.append(el('b',null,label),el('span',null,text));row.title=text;overview.append(row);
 }
 const aiOverview=el('div','overview-row');
 const aiText=state.ai.mode==='none'?'使わない':AI_MODES[state.ai.mode].name+' · '+JSON.stringify(state.ai.classes.split(/\r?\n/));
 aiOverview.append(el('b',null,'AI'),el('span',null,aiText));aiOverview.title=aiText;overview.append(aiOverview);

 for(const [key,group] of [['sensors','S'],['actuators','A']]){
  const list=$('equipped-'+key);list.replaceChildren();
  if(!state[key].length)list.append(el('p','equipment-empty',group==='S'?'調べたいことから、道具を選ぼう。':'光・音・動き。何で伝える？'));
  state[key].forEach((item,index)=>{
   const d=findDevice(item.deviceId),target='item-'+item.id;
   const errors=result.errors.filter(e=>e.target===target),warnings=result.warnings.filter(e=>e.target===target);
   const card=el('article','equipment-item');card.dataset.itemId=item.id;card.dataset.deviceId=d.id;
   const top=el('div','equipment-item-top'),info=el('div');
   info.append(el('b',null,group+(index+1)+' '+d.name),el('small',null,d.builtIn?'micro:bit内蔵':'外付け · '+d.connection));
   top.append(deviceImage(d,'equipment-thumbnail'),info);card.append(top);
   const pins=d.fields.filter(f=>f.kind==='pin'||f.kind==='fixed');
   const connection=d.builtIn?'内蔵 · 外付け端子なし':pins.map(f=>f.label+'：'+(f.kind==='fixed'?f.value:item.connections[f.key]||'未設定')).join(' / ');
   card.append(el('p','equipment-connection',connection));
   card.append(el('span',errors.length?'equipment-status incomplete':'equipment-status complete',errors.length?'⚠ 未設定・入力を確認':'✓ 入力済み'));
   if(errors.length||warnings.length){
    const details=el('details','equipment-issues');details.append(el('summary',null,errors.length?'入力確認 '+errors.length+'件':'対応・配線の確認 '+warnings.length+'件'));
    const ul=el('ul');for(const issue of [...errors,...warnings])ul.append(el('li',null,issue.message));details.append(ul);card.append(details);
   }
   const actions=el('div','equipment-actions'),edit=el('button',null,'編集'),remove=el('button',null,'外す');
   edit.type=remove.type='button';edit.setAttribute('aria-label',group+(index+1)+' '+d.name+'を編集');remove.setAttribute('aria-label',group+(index+1)+' '+d.name+'を外す');
   edit.addEventListener('click',()=>editDevice(key,item.id));remove.addEventListener('click',()=>removeEquipment(key,item.id));
   actions.append(edit,remove);card.append(actions);list.append(card);
  });
 }
 const ai=$('equipped-ai');ai.replaceChildren();
 if(state.ai.mode==='none')ai.append(el('p','equipment-empty','AIは使わない'));
 else{
  const card=el('article','equipment-item ai-equipment-item'),img=el('img','equipment-thumbnail');
  img.src='./assets/devices/ai-'+state.ai.mode+'.webp';img.alt='';
  const top=el('div','equipment-item-top');top.append(img,el('b',null,AI_MODES[state.ai.mode].name));card.append(top);
  card.append(el('p','equipment-classes',state.ai.classes?JSON.stringify(state.ai.classes.split(/\r?\n/)):'Class名は未設定'));
  const aiErrors=result.errors.filter(e=>['ai-mode','classes','model-url'].includes(e.target));
  card.append(el('span',aiErrors.length?'equipment-status incomplete':'equipment-status complete',aiErrors.length?'⚠ Class・URLを確認':'✓ 入力済み'));
  if(state.ai.mode==='pose')card.append(el('p','equipment-note','B2S連携は未確認'));
  if(!state.ai.url)card.append(el('p','equipment-note','モデルURL未入力 · 設定方法をGemに確認'));
  const actions=el('div','equipment-actions ai-actions'),edit=el('button','ai-edit','編集'),remove=el('button',null,'外す');
  edit.type=remove.type='button';edit.setAttribute('aria-label','AIの設定を編集');remove.setAttribute('aria-label','AIを外す');
  edit.addEventListener('click',()=>goStep('step4'));
  remove.addEventListener('click',()=>{state.ai.mode='none';renderAI();changed();$('equipment-message').textContent='AIを発明セットから外しました。';$('review-settings').focus({preventScroll:true});});
  actions.append(edit,remove);card.append(actions);ai.append(card);
 }
 $('review-settings').textContent=result.errors.length?'⚠ 入力確認 '+result.errors.length+'件 · 最終チェックへ':'✓ 必須入力OK · 指示文を完成させる';
}
function animateEquip(deviceId,itemId){
 $('equipment-message').textContent=findDevice(deviceId).name+'を発明セットに追加しました。';
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const card=[...document.querySelectorAll('.equipment-item')].find(n=>n.dataset.itemId===itemId);
 card?.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
 $('equipment').animate([{boxShadow:'0 0 0 0 #3eb89b99'},{boxShadow:'0 0 0 8px #3eb89b00'}],{duration:650});
 const source=document.querySelector(`button.device-pick[data-device-id="${deviceId}"] img`),dest=$('equipment-title');
 if(!source)return;const from=source.getBoundingClientRect(),to=dest.getBoundingClientRect();
 if(from.bottom<0||from.top>innerHeight||to.bottom<0||to.top>innerHeight)return;
 const token=source.cloneNode();token.className='equip-token';Object.assign(token.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});document.body.append(token);
 const animation=token.animate([{transform:'translate(0,0) scale(1)',opacity:.8},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(.2)`,opacity:0}],{duration:430,easing:'ease-in'});
 animation.onfinish=()=>token.remove();animation.oncancel=()=>token.remove();
}
for(const link of document.querySelectorAll('.step-nav nav a'))link.addEventListener('click',e=>{e.preventDefault();goStep(link.hash.slice(1));});
$('previous-step').addEventListener('click',()=>goStep('step'+(Number(activeStep.slice(4))-1)));
$('next-step').addEventListener('click',()=>goStep('step'+(Number(activeStep.slice(4))+1)));
$('equipment-toggle').addEventListener('click',()=>{const open=$('equipment').classList.toggle('is-open');$('equipment-toggle').setAttribute('aria-expanded',String(open));$('equipment-toggle').textContent=open?'発明セットを閉じる ↑':'発明セットを開く ↓';});
$('review-settings').addEventListener('click',()=>{goStep('step6');showIssues(validate(state));});
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();goStep('step1');$('purpose').focus();});
window.addEventListener('hashchange',()=>goStep(location.hash.slice(1)));
render();goStep(/^#step[1-6]$/.test(location.hash)?location.hash.slice(1):'step1',false);
