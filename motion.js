/* Motion Prompt-inspired UI · MIT (c) 2026 Shohei Ohtaki.
 * https://showheyohtaki.github.io/motion-prompt/
 * Independent DOM/Canvas adaptations; see docs/motion-map.md for timing changes. */
const $=id=>document.getElementById(id);
export const MOTION={micro:160,base:300,hero:700,flight:520,toast:3000,particles:1100,stagger:50,ease:'cubic-bezier(.2,.8,.2,1)',pop:'cubic-bezier(.2,1.18,.4,1)'};
export function initMotion(){
 const root=document.documentElement,os=matchMedia('(prefers-reduced-motion: reduce)'),running=new Set(),cleanups=new Set();
 let preference=null,toastTimer,flightCount=0,confettiStop=null,lastCopy=0,copiedSignature=null,copiedPrompt=null,lastState=null,generatedTimer,doneTimer;
 try{preference=localStorage.getItem('b2s-motion-enabled');}catch{}
 const enabled=()=>!os.matches&&preference!=='off'&&!document.hidden;
 // #059 Toggle: OS reduce always wins over a saved ON preference.
 const toggle=document.createElement('button');toggle.id='motion-toggle';toggle.type='button';toggle.setAttribute('role','switch');toggle.innerHTML='うごき <span class="motion-track" aria-hidden="true"><i></i></span><span class="motion-value"></span>';
 document.querySelector('.header-right').prepend(toggle);
 function applyPreference(){
  root.dataset.motion=enabled()?'on':'off';toggle.setAttribute('aria-checked',String(!os.matches&&preference!=='off'));toggle.querySelector('.motion-value').textContent=os.matches?'OFF（端末設定）':preference==='off'?'OFF':'ON';
  toggle.disabled=os.matches;
  if(!enabled()){
   for(const animation of [...running])animation.cancel();
   for(const cleanup of [...cleanups])cleanup();
   confettiStop?.();
   for(const label of document.querySelectorAll('.ai-options label'))label.style.transform='';if($('generate'))$('generate').style.translate='';
   for(const hint of document.querySelectorAll('.typing-hint'))hint.hidden=true;
   for(const field of document.querySelectorAll('.typing-field'))field.classList.remove('typing-field');
  }
 }
 toggle.addEventListener('click',()=>{preference=preference==='off'?'on':'off';try{localStorage.setItem('b2s-motion-enabled',preference);}catch{}applyPreference();});
 os.addEventListener('change',applyPreference);document.addEventListener('visibilitychange',applyPreference);applyPreference();
 function animate(node,frames,options={}){
  if(!node||!enabled()||running.size>=(confettiStop?4:5)||!onScreen(node))return null;
  const animation=node.animate(frames,{duration:MOTION.base,easing:MOTION.ease,...options});running.add(animation);document.querySelector('.workshop-title')?.classList.add('motion-ambient-paused');
  animation.finished.catch(()=>{}).finally(()=>{running.delete(animation);if(!running.size&&!confettiStop)document.querySelector('.workshop-title')?.classList.remove('motion-ambient-paused');});return animation;
 }
 function transient(node){
  const remove=()=>{node.remove();cleanups.delete(remove);};cleanups.add(remove);return remove;
 }
 function pop(node){if(!node)return;const base=getComputedStyle(node).transform,prefix=base==='none'?'':base+' ';return animate(node,[{transform:prefix+'scale(.94)',opacity:.6},{transform:prefix+'scale(1.06)',opacity:1,offset:.65},{transform:prefix+'scale(1)',opacity:1}],{easing:MOTION.pop});}
 function onScreen(node){const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
 // #056 Toast: one reusable live region; messages never replace safety guidance.
 const toast=document.createElement('div');toast.id='motion-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');document.body.append(toast);
 function notify(text){clearTimeout(toastTimer);toast.textContent=text;toast.hidden=false;const x=innerWidth<=900?'translateX(-50%) ':'';animate(toast,[{opacity:0,transform:x+'translateY(8px)'},{opacity:1,transform:x+'translateY(0)'}]);toastTimer=setTimeout(()=>{toast.hidden=true;toast.textContent='';},MOTION.toast);}
 // #085 Ripple: fixed decoration survives rerenders without changing button layout.
 function ripple(target,x,y){
  if(!enabled()||!target||target.disabled)return;
  const r=target.getBoundingClientRect(),layer=document.createElement('span'),circle=document.createElement('i');
  layer.className='motion-ripple';layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',borderRadius:getComputedStyle(target).borderRadius});
  const size=Math.hypot(r.width,r.height)*2;Object.assign(circle.style,{width:size+'px',height:size+'px',left:(x-r.left-size/2)+'px',top:(y-r.top-size/2)+'px'});layer.append(circle);document.body.append(layer);const remove=transient(layer);
  const a=animate(circle,[{transform:'scale(0)',opacity:.22},{transform:'scale(1)',opacity:0}],{duration:MOTION.base*2});if(a)a.finished.catch(()=>{}).finally(remove);else remove();
 }
 const pressTarget=event=>event.target.closest('button,.ai-options label,.prompt-mode label,summary,.step-nav nav a');
 document.addEventListener('pointerdown',e=>{if(e.button===0)ripple(pressTarget(e),e.clientX,e.clientY);});
 document.addEventListener('keydown',e=>{if(!e.repeat&&['Enter',' '].includes(e.key)){const node=pressTarget(e);if(node){const r=node.getBoundingClientRect();ripple(node,r.left+r.width/2,r.top+r.height/2);}}});
 // #126 / #071 / #001: actual state updates immediately; only the duplicate flies.
 const dock=document.createElement('button');dock.id='motion-dock';dock.type='button';dock.textContent='自分の発明 0個';dock.setAttribute('aria-controls','equipment-content');document.body.append(dock);
 dock.addEventListener('click',()=>{if(!$('equipment').classList.contains('is-open'))$('equipment-toggle').click();$('equipment').scrollIntoView({block:'start',behavior:enabled()?'smooth':'instant'});$('equipment-toggle').focus({preventScroll:true});});
 function source(node){if(!node)return null;return {rect:node.getBoundingClientRect(),src:node.currentSrc||node.src};}
 function added(origin,itemId,kind){
  const card=kind==='ai'?document.querySelector('.ai-equipment-item'):[...document.querySelectorAll('.equipment-item')].find(n=>n.dataset.itemId===itemId);
  const count=$('equipment-count'),section=$(kind==='ai'?'equipped-ai':'equipped-'+kind);
  const destination=innerWidth<=900?dock:(onScreen(section)?section:$('equipment-title'));
  const arrive=()=>{pop(count);pop(innerWidth<=900?dock:card);const button=document.querySelector(`.device-pick[data-device-id="${card?.dataset.deviceId}"] .tile-add`);pop(button);};
  if(!enabled()){card?.classList.add('motion-static-highlight');setTimeout(()=>card?.classList.remove('motion-static-highlight'),200);return;}
  if(!origin?.src||flightCount>=3||!onScreen(destination)){arrive();return;}
  const from=origin.rect,to=destination.getBoundingClientRect();if(from.bottom<0||from.top>innerHeight){arrive();return;}
  const token=document.createElement('img');token.className='equip-token motion-flight';token.src=origin.src;token.alt='';token.setAttribute('aria-hidden','true');Object.assign(token.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});document.body.append(token);flightCount++;
  const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2,arc=Math.min(110,Math.abs(dx)*.2+45);
  const frames=Array.from({length:25},(_,i)=>{const t=i/24;return {offset:t,transform:`translate(${dx*t}px,${dy*t-4*arc*t*(1-t)}px) scale(${1-.6*t})`,opacity:1-.3*t};});
  const removeToken=transient(token);let removed=false;const cleanup=()=>{if(removed)return;removed=true;flightCount--;removeToken();};
  const animation=animate(token,frames,{duration:MOTION.flight});if(animation)animation.finished.then(()=>{cleanup();arrive();},cleanup);else{cleanup();arrive();}
 }
 // #015 Particles: one canvas, <=60 particles, finite lifetime, hidden tab cleanup.
 function celebrate(){
  const now=performance.now(),repeat=now-lastCopy<5000;lastCopy=now;
  if(!enabled())return;confettiStop?.();
  const rect=$('copy').getBoundingClientRect();if(!onScreen($('copy')))return;
  const canvas=document.createElement('canvas');canvas.className='motion-confetti';canvas.setAttribute('aria-hidden','true');const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;document.body.append(canvas);
  const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}ctx.scale(dpr,dpr);
  const start=performance.now(),x=rect.left+rect.width/2,y=rect.top+rect.height/2,colors=['#146b58','#e4b84d','#d68370','#6fb9b1'];
  const particles=Array.from({length:repeat?30:60},()=>({vx:(Math.random()-.5)*380,vy:-250-Math.random()*150,rotation:Math.random()*6,size:4+Math.random()*4,color:colors[Math.floor(Math.random()*colors.length)]}));
  let frame;const stop=()=>{cancelAnimationFrame(frame);canvas.remove();if(confettiStop===stop)confettiStop=null;if(!running.size)document.querySelector('.workshop-title')?.classList.remove('motion-ambient-paused');};confettiStop=stop;document.querySelector('.workshop-title')?.classList.add('motion-ambient-paused');
  const draw=time=>{const t=(time-start)/1000;if(!enabled()||t>=MOTION.particles/1000){stop();return;}ctx.clearRect(0,0,innerWidth,innerHeight);ctx.globalAlpha=Math.min(1,t/.06,(1.1-t)/.3);
   for(const p of particles){ctx.save();ctx.translate(x+p.vx*t,y+p.vy*t+235*t*t);ctx.rotate(p.rotation+t*3);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.65);ctx.restore();}frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);
 }
 // #068 / #057 / #150: wizard current step, not a scroll spy.
 const nav=document.querySelector('.step-nav nav'),indicator=document.createElement('i');indicator.className='motion-nav-indicator';indicator.setAttribute('aria-hidden','true');nav.append(indicator);
 const links=[...nav.querySelectorAll('a')];for(const link of links){const check=document.createElement('i');check.className='motion-check';check.textContent='✓';check.setAttribute('aria-hidden','true');link.querySelector('span').append(check);const sr=document.createElement('small');sr.className='sr-only motion-complete-label';link.append(sr);}
 function moveIndicator(){const target=nav.querySelector('[aria-current=step]');if(!target)return;const r=target.getBoundingClientRect(),n=nav.getBoundingClientRect();Object.assign(indicator.style,{width:r.width+'px',height:r.height+'px',transform:`translate(${r.left-n.left}px,${r.top-n.top}px)`});}
 function sync(state,step){
  lastState=state;
  for(const id of ['purpose-summary','behavior-summary']){const node=$(id);if(node.dataset.motionPrevious!==undefined&&node.dataset.motionPrevious!==node.textContent)animate(node,[{opacity:.55},{opacity:1}],{duration:MOTION.base*2});node.dataset.motionPrevious=node.textContent;}
  if(copiedSignature!==state.signature||copiedPrompt!==state.prompt||!state.prompt||$('copy').disabled)copiedSignature=null;
  const complete=[!!state.purpose.trim(),state.sensors.length>0,state.ai.mode!=='none',state.actuators.length>0,!!state.behavior.trim(),!!state.prompt&&!$('copy').disabled];
  links.forEach((link,i)=>{const was=link.classList.contains('motion-complete');link.classList.toggle('motion-complete',complete[i]);link.classList.toggle('motion-copied',i===5&&!!copiedSignature);link.querySelector('.motion-complete-label').textContent=complete[i]?(i===5&&copiedSignature?' コピー済み':' 入力済み'):'';if(!was&&complete[i])pop(link.querySelector('.motion-check'));});
  // #072 / #004 add a decorative box while preserving the original empty text.
  for(const node of document.querySelectorAll('.equipment-empty')){if(!node.querySelector('svg')){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 32 28');icon.setAttribute('aria-hidden','true');icon.classList.add('motion-empty-icon');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 8 16 2 29 8 29 22 16 27 3 22Z M3 8 16 14 29 8 M16 14V27');icon.append(path);node.prepend(icon);}}
  dock.textContent='自分の発明 '+(state.sensors.length+state.actuators.length)+'個';dock.setAttribute('aria-expanded',$('equipment-toggle').getAttribute('aria-expanded'));
  for(const id of ['sensor-count','actuator-count','equipment-count']){const badge=$(id);badge.setAttribute('aria-live','polite');badge.setAttribute('aria-atomic','true');}
  moveIndicator();
 }
 // Radio selections use native inputs and CSS on the outer selected card.
 // The previous floating .motion-selection box tracked the inner span,
 // obscuring labels on steps 3 and 6.
 new ResizeObserver(moveIndicator).observe($('builder'));
 // #006 / #159: visual hints only, never input values. No validation while typing.
 const hints={purpose:'夜、暗くなったら自動で光るライトを作りたい',behavior:'暗くなったらライトがつく。明るくなったら消える'};
 const typing=new Map();
 for(const [id,text] of Object.entries(hints)){
  const field=$(id),wrap=document.createElement('div');wrap.className='motion-input-wrap';field.before(wrap);wrap.append(field);
  const overlay=document.createElement('span');overlay.className='typing-hint';overlay.setAttribute('aria-hidden','true');overlay.hidden=true;wrap.append(overlay);
  const message=document.createElement('p');message.id=id+'-motion-help';message.className='motion-inline';message.hidden=true;message.setAttribute('aria-live','polite');wrap.after(message);field.setAttribute('aria-describedby',message.id);
  const stop=()=>{clearTimeout(typing.get(id)?.timer);overlay.hidden=true;field.classList.remove('typing-field');};typing.set(id,{started:false,stop,timer:null});
  field.addEventListener('focus',stop);field.addEventListener('input',()=>{stop();message.hidden=true;field.classList.remove('motion-needs-input');});
  field.addEventListener('blur',()=>inline(field));
  function inline(input){message.hidden=false;message.textContent=input.value.trim()?'✓ OK！':'ここに書くと、Gemが考えやすくなるよ';input.classList.toggle('motion-needs-input',!input.value.trim());}
 }
 function startHint(id){const entry=typing.get(id),field=$(id);if(!entry||!field)return;if(entry.started||field.value||field===document.activeElement||!enabled()||!onScreen(field))return;entry.started=true;const overlay=field.parentElement.querySelector('.typing-hint');overlay.hidden=false;field.classList.add('typing-field');let index=0;const tick=()=>{if(!enabled()||!onScreen(field)){entry.stop();return;}overlay.textContent=hints[id].slice(0,++index);if(index<hints[id].length)entry.timer=setTimeout(tick,90);};tick();}
 // #137 Push: only the incoming real panel moves; no cloned form or focus trap.
 function panel(id,previous,focus){
  for(const entry of typing.values())entry.stop();
  const panel=$(id),direction=Number(id.slice(4))>=Number(previous.slice(4))?1:-1;
  animate(panel,[{transform:`translateX(${direction*22}px)`,opacity:.45},{transform:'translateX(0)',opacity:1}]);
  if(focus)window.scrollTo({top:0,behavior:enabled()?'smooth':'instant'});
  requestAnimationFrame(()=>{startHint(id==='step1'?'purpose':id==='step5'?'behavior':'');moveIndicator();});
 }
 // #049 Native dialog: built-in focus containment and Escape, default is cancel.
 const dialog=document.createElement('dialog');dialog.id='reset-dialog';dialog.setAttribute('aria-labelledby','reset-dialog-title');dialog.innerHTML='<form method="dialog"><h2 id="reset-dialog-title">このブラウザに保存した入力と指示文を消しますか？</h2><div class="motion-dialog-actions"><button value="cancel" autofocus>やめる</button><button value="reset">すべてリセット</button></div></form>';document.body.append(dialog);
 function confirmReset(){if(dialog.open)return Promise.resolve(false);return new Promise(resolve=>{const trigger=document.activeElement;dialog.returnValue='cancel';dialog.addEventListener('close',()=>{trigger?.focus({preventScroll:true});resolve(dialog.returnValue==='reset');},{once:true});dialog.showModal();pop(dialog);});}
 // #005 hero mask: one entrance, no ambient loops.
 const hero=document.querySelector('.workshop-title h1');animate(hero,[{clipPath:'inset(100% 0 0 0)',transform:'translateY(12px)'},{clipPath:'inset(0 0 0 0)',transform:'translateY(0)'}],{duration:MOTION.hero});
 // #022 One logo light sweep; no recurring flashing.
 const logo=document.querySelector('.brand-icon');const sweep=document.createElement('i');sweep.className='motion-logo-sweep';sweep.setAttribute('aria-hidden','true');logo.append(sweep);animate(sweep,[{transform:'translateX(-140%) skewX(-20deg)',opacity:0},{opacity:.4,offset:.5},{transform:'translateX(240%) skewX(-20deg)',opacity:0}],{duration:MOTION.hero});
 // #051 preserve the existing mobile disclosure; opening motion and drag handle.
 const handle=document.createElement('button');handle.id='motion-sheet-handle';handle.type='button';handle.textContent='発明セットを閉じる';handle.setAttribute('aria-label','発明セットを閉じる');$('equipment-content').prepend(handle);
 let dragY=null,dragged=false;handle.addEventListener('click',()=>{if(dragged){dragged=false;return;}$('equipment-toggle').click();});
 handle.addEventListener('pointerdown',e=>{dragY=e.clientY;handle.setPointerCapture(e.pointerId);});handle.addEventListener('pointerup',e=>{if(dragY!==null&&e.clientY-dragY>45){dragged=true;$('equipment-toggle').click();}dragY=null;});handle.addEventListener('pointercancel',()=>{dragY=null;});
 $('equipment-toggle').addEventListener('click',()=>queueMicrotask(()=>{const open=$('equipment').classList.contains('is-open');dock.setAttribute('aria-expanded',String(open));if(open)animate($('equipment-content'),[{transform:'translateY(18px)',opacity:.4},{transform:'translateY(0)',opacity:1}]);}));
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(!entry.isIntersecting)for(const animation of [...running])if(entry.target.contains(animation.effect?.target))animation.cancel();});observer.observe(document.querySelector('.workshop-title'));observer.observe($('builder'));observer.observe($('equipment'));

 // P2: #022 / #082 / #125 / #134 / #054 / #072 / #080 / #084 / #153.
 const safety=document.querySelector('#prompt-mode .helper');
 const phrase='安全に関わる条件';
 const parts=safety.textContent.split(phrase);safety.replaceChildren(document.createTextNode(parts[0]));
 const marked=document.createElement('span');marked.className='motion-safety-marker';marked.textContent=phrase;const markLine=document.createElement('i');markLine.className='motion-mark-line';markLine.setAttribute('aria-hidden','true');marked.prepend(markLine);safety.append(marked,document.createTextNode(parts[1]));
 const seenPanels=new Set();
 const originalPanel=panel;
 panel=(id,previous,focus)=>{originalPanel(id,previous,focus);if(!seenPanels.has(id)){seenPanels.add(id);const badge=$(id).querySelector('.step-number');if(id==='step2')animate(badge,[{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:MOTION.base,iterations:3});if(id==='step4')animate(badge,[{transform:'rotate(0)'},{transform:'rotate(360deg)'}]);if(id==='step6')animate(markLine,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:MOTION.hero});}};
 for(const id of ['purpose','behavior']){let filled=!!$(id).value.trim();$(id).addEventListener('input',()=>{const now=!!$(id).value.trim();if(now&&!filled)animate($('next-step'),[{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:MOTION.base,iterations:2});filled=now;});}
 const poseWarning=document.querySelector('.ai-options .warning');
 const info=document.createElement('button');info.type='button';info.className='motion-tooltip-trigger';info.textContent='説明';info.setAttribute('aria-expanded','false');info.setAttribute('aria-controls','motion-pose-help');
 const tip=document.createElement('p');tip.id='motion-pose-help';tip.hidden=true;tip.textContent='Block2Scriptとのつながりは、まだ確認中です。先生と相談しよう。';
 // Outside the radio label: opening help must never select an AI mode.
 document.querySelector('.ai-options').after(info,tip);
 info.addEventListener('click',()=>{tip.hidden=!tip.hidden;info.setAttribute('aria-expanded',String(!tip.hidden));});
 info.addEventListener('keydown',e=>{if(e.key==='Escape'){tip.hidden=true;info.setAttribute('aria-expanded','false');}});
 info.setAttribute('aria-label',poseWarning.textContent+'の説明');
 // #129 Only the decorative English eyebrow scrambles; accessible text stays stable.
 const eyebrow=document.querySelector('.workshop-title > div > .eyebrow'),eyebrowText=eyebrow.textContent;
 if(enabled()&&onScreen(eyebrow)){const visual=document.createElement('span'),accessible=document.createElement('span');visual.setAttribute('aria-hidden','true');accessible.className='sr-only';accessible.textContent=eyebrowText;eyebrow.replaceChildren(visual,accessible);let index=0,timer;const stop=()=>{clearTimeout(timer);visual.textContent=eyebrowText;cleanups.delete(stop);};cleanups.add(stop);const tick=()=>{if(!enabled()||!onScreen(eyebrow)){stop();return;}visual.textContent=eyebrowText.slice(0,index)+eyebrowText.slice(index).replace(/[A-Z]/g,()=>String.fromCharCode(65+Math.floor(Math.random()*26)));index+=3;if(index>=eyebrowText.length)stop();else timer=setTimeout(tick,80);};tick();}
 const hover=matchMedia('(hover:hover) and (pointer:fine)');
 document.querySelectorAll('.ai-options label:has(img)').forEach(label=>{label.addEventListener('pointermove',e=>{if(!enabled()||!hover.matches)return;const r=label.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;label.style.transform=`perspective(700px) rotateX(${-y*6}deg) rotateY(${x*6}deg)`;});label.addEventListener('pointerleave',()=>{label.style.transform='';});});
 const generate=$('generate');const generateLabel=document.createElement('span');generateLabel.className='motion-generate-label';generateLabel.append(...generate.childNodes);const generateShape=document.createElement('i');generateShape.className='motion-generate-shape';generateShape.setAttribute('aria-hidden','true');generate.append(generateLabel,generateShape);generate.addEventListener('pointermove',e=>{if(!enabled()||!hover.matches)return;const r=generate.getBoundingClientRect();generate.style.translate=`${((e.clientX-r.left)/r.width-.5)*4}px ${((e.clientY-r.top)/r.height-.5)*4}px`;});generate.addEventListener('pointerleave',()=>{generate.style.translate='';});
 // #095 / #096: two subtle CSS environment layers, paused offscreen/hidden/OFF.
 const heroBox=document.querySelector('.workshop-title'),environment=document.createElement('div');environment.className='motion-environment';environment.setAttribute('aria-hidden','true');
 for(const id of ['light','servo']){const img=document.createElement('img');img.src='./assets/devices/'+id+'.svg';img.alt='';img.width=60;img.height=44;environment.append(img);}heroBox.append(environment);
 new IntersectionObserver(entries=>{heroBox.classList.toggle('motion-hero-visible',entries[0].isIntersecting);}).observe(heroBox);
 window.addEventListener('pagehide',()=>{observer.disconnect();},{once:true});
 function removing(node){if(!node||!onScreen(node)||!enabled())return;const r=node.getBoundingClientRect(),ghost=node.cloneNode(true);ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));ghost.querySelectorAll('input,button,select,textarea,a').forEach(n=>{n.tabIndex=-1;n.removeAttribute('name');});ghost.inert=true;ghost.classList.add('motion-removing');ghost.setAttribute('aria-hidden','true');Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.append(ghost);const remove=transient(ghost),a=animate(ghost,[{transform:'scale(1)',opacity:1},{transform:'scale(.92)',opacity:0}],{duration:MOTION.micro});if(a)a.finished.catch(()=>{}).finally(remove);else remove();}
 return {sync,source,added,notify,panel,confirmReset,removing,reselected:pop,
  sample(){notify('サンプルを読み込んだよ');[...document.querySelectorAll('.equipment-item')].filter(onScreen).slice(0,4).forEach((node,i)=>animate(node,[{transform:'translateY(8px) scale(.96)',opacity:.4},{transform:'translateY(0) scale(1)',opacity:1}],{delay:i*MOTION.stagger}));},
  generated(){sync(lastState,'step6');animate($('result'),[{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0 0)'}]);/* #160 visual response only: generation has already finished, no artificial wait. */
   clearTimeout(generatedTimer);clearTimeout(doneTimer);generate.classList.remove('motion-generated');
   if(enabled()){generate.classList.add('motion-generating');generatedTimer=setTimeout(()=>{generate.classList.remove('motion-generating');generate.classList.add('motion-generated');doneTimer=setTimeout(()=>generate.classList.remove('motion-generated'),MOTION.particles);},MOTION.base);}
},
  copied(signature){copiedSignature=signature;copiedPrompt=lastState.prompt;sync(lastState,'step6');notify('コピーしたよ！専用Gemに貼り付けて送信しよう');celebrate();},
  failedCopy(){notify('コピーできなかったよ。文章を選んでコピーしてね');},
  validate(){for(const id of ['purpose','behavior']){const field=$(id),message=$(id+'-motion-help');if(!field.value.trim()){message.hidden=false;message.textContent='ここに書くと、Gemが考えやすくなるよ';field.classList.add('motion-needs-input');}}},
  reset(){copiedSignature=null;for(const id of ['purpose','behavior']){$(id+'-motion-help').hidden=true;$(id).classList.remove('motion-needs-input');}notify('リセットしたよ');}
 };
}
