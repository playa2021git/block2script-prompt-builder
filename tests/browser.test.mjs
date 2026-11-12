import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {DEVICES} from '../data/devices.js';
import {sampleState,generatePrompt,inputSignature,STORAGE_KEY,emptyState,makeItem} from '../core.js';
const base=process.env.TEST_URL||'http://127.0.0.1:5180/';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1366,height:960},permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage(),errors=[],external=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
context.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});
await mkdir('work',{recursive:true});
async function go(p,n){await p.locator(`.step-nav a[href="#step${n}"]`).click();assert.equal(await p.locator('#builder > .card:visible').count(),1);}

try{
 await page.goto(base);await page.waitForSelector('#sensor-choice optgroup',{state:'attached'});
 // Every catalogue image must match its device, load locally, and stay in its S/A group.
 assert.equal(await page.locator('.device-pick').count(),DEVICES.length);
 for(const d of DEVICES){
  const tile=page.locator(`#${d.group==='S'?'sensor':'actuator'}-catalog button[data-device-id="${d.id}"]`);
  assert.equal(await tile.count(),1);assert.ok((await tile.textContent()).includes(d.name));
  assert.match(await tile.locator('img').getAttribute('src'),new RegExp('/'+d.id+'\\.(svg|webp)$'));
  assert.ok((await tile.locator('img').getAttribute('alt')).includes(d.name));
 }
 await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));});
 assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
 // Keyboard addition, repeated devices, removal, and built-in/external connection fields.
 await go(page,2);const buttons=page.locator('button.device-pick[data-device-id=buttons]');await buttons.focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#sensor-list .device-item').count(),1);
 assert.equal(await page.locator('#sensor-list .connection-fields').count(),0);
 await page.keyboard.press('Space');assert.equal(await page.locator('#sensor-list .device-item').count(),1);
 assert.match(await buttons.textContent(),/選択済み/);
 assert.equal(await page.locator('#equipped-sensors .equipment-highlight').count(),1);
 await page.locator('#equipped-sensors .equipment-actions button').filter({hasText:'外す'}).click();
 assert.equal(await page.locator('#sensor-list .device-item').count(),0);
 for(const d of DEVICES){
  await go(page,d.group==='S'?2:4);await page.locator(`button.device-pick[data-device-id="${d.id}"]`).click();
  const selected=page.locator(`#${d.group==='S'?'sensor':'actuator'}-list .device-item`).last();
  assert.equal(await selected.locator('.connection-fields input,.connection-fields select').count(),d.fields.length);
  assert.equal(await selected.locator('img').getAttribute('src'),await page.locator(`button.device-pick[data-device-id="${d.id}"] img`).getAttribute('src'));
  await selected.locator('.remove').click();
 }
 await go(page,2);
 // Image failure leaves the named native button usable.
 await buttons.locator('img').evaluate(img=>img.src='data:image/png;base64,');await buttons.click();
 assert.equal(await page.locator('#sensor-list .device-item').count(),1);await page.locator('#sensor-list .remove').click();
 // A pre-existing v1 save keeps device IDs, connections, AI classes, notes and edited prompt.
 const legacy=sampleState();legacy.sensors[1].connections.signal='P1';legacy.prompt=generatePrompt(legacy)+'\n以前の追記';legacy.signature=inputSignature(legacy);
 // Isolate this fixture from the original page's debounced auto-save timer.
 const legacyContext=await browser.newContext({storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:STORAGE_KEY,value:JSON.stringify(legacy)}]}]}});
 legacyContext.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 legacyContext.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});
 const restored=await legacyContext.newPage();await restored.goto(base);await restored.waitForSelector('#sensor-list .device-item',{state:'attached'});
 assert.equal(await restored.locator('#S-1-signal').inputValue(),'P1');
 assert.equal(await restored.locator('#classes').inputValue(),legacy.ai.classes);
 assert.equal(await restored.locator('#prompt').inputValue(),legacy.prompt);assert.equal(await restored.locator('#copy').isDisabled(),false);
 await legacyContext.close();
 // Complete a new project entirely through the graphical UI, including exact sound Class names.
 const manualContext=await browser.newContext();manualContext.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});manualContext.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));const manual=await manualContext.newPage();
 await manual.goto(base);await go(manual,1);await manual.locator('#purpose').fill('拍手で音を出す作品');
 await go(manual,2);await manual.locator('button.device-pick[data-device-id=buttons]').click();
 await go(manual,4);await manual.locator('button.device-pick[data-device-id=speaker]').click();
 assert.match(await manual.locator('#actuator-list').textContent(),/micro:bit V2内蔵スピーカー/);
 await go(manual,3);await manual.locator('[name=ai-mode][value=sound]').check();
 await go(manual,3);await manual.locator('#classes').fill(' Clap \nquiet');
 await go(manual,3);await manual.locator('#model-url').fill('https://teachablemachine.withgoogle.com/models/example/');
 await go(manual,5);await manual.locator('#behavior').fill('拍手を認識したら音を鳴らす。ボタンAで止める。');
 await go(manual,6);await manual.locator('#generate').click();
 const manualState=emptyState();manualState.purpose='拍手で音を出す作品';
 manualState.sensors=[makeItem('buttons','manual-s')];manualState.actuators=[makeItem('speaker','manual-a')];
 manualState.ai={mode:'sound',classes:' Clap \nquiet',url:'https://teachablemachine.withgoogle.com/models/example/'};
 manualState.behavior='拍手を認識したら音を鳴らす。ボタンAで止める。';
 assert.equal(await manual.locator('#prompt').inputValue(),generatePrompt(manualState));
 await go(manual,3);await manual.locator('[name=ai-mode][value=pose]').check();assert.match(await manual.locator('#ai-support').textContent(),/未確認/);
 await manualContext.close();
 // Chromebook and narrow layouts must not overflow or overlap cards.
 await go(page,2);
 for(const width of [1366,1024,768,390]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const boxes=await page.locator('#sensor-catalog .device-tile').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(boxes[i].right<=boxes[j].x+1||boxes[j].right<=boxes[i].x+1||boxes[i].bottom<=boxes[j].y+1||boxes[j].bottom<=boxes[i].y+1);
  if(width===1024)await page.screenshot({animations:'disabled',path:'work/chromebook-catalog.png',fullPage:true});
 }
 await page.setViewportSize({width:1366,height:960});
 assert.equal(await page.locator('#sensor-choice option').filter({hasText:'ポンプ'}).count(),0);
 assert.equal(await page.locator('#actuator-choice option').filter({hasText:'センサ'}).count(),0);
 await go(page,3);assert.equal(await page.locator('#ai-fields').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({animations:'disabled',path:'work/desktop.png'});
 for(const [id,name] of [['step2','sensors'],['step4','actuators'],['step3','ai']]){await go(page,Number(id.slice(4)));await page.screenshot({animations:'disabled',path:'work/'+name+'.png',fullPage:true});}
 await page.getByRole('button',{name:/既製品：夜間防犯ライト/}).click();
 assert.equal(await page.locator('#purpose').inputValue(),sampleState().purpose);
 assert.equal(await page.locator('#classes').inputValue(),'');
 assert.equal(await page.locator('#sample-pir-signal').inputValue(),'');
 await go(page,6);await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/信号/);assert.equal(await page.locator('#result').isVisible(),false);
 await go(page,2);await page.locator('#sample-pir-signal').selectOption('P1');await go(page,6);await page.locator('#generate').click();
 const prompt=await page.locator('#prompt').inputValue();const expected=sampleState();expected.sensors[1].connections.signal='P1';assert.equal(prompt,generatePrompt(expected));assert.ok(prompt.includes('10未満、かつ人感センサがON'));assert.ok(prompt.includes('25個のLEDをすべて点灯'));assert.ok(prompt.includes('信号（OUT）：P1'));assert.ok(!prompt.includes('【Teachable Machine】'));
 await go(page,6);await page.locator('#copy').click();await page.waitForFunction(()=>document.querySelector('#action-status').textContent.includes('コピーしました'));assert.match(await page.locator('#action-status').textContent(),/コピーしました/);assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),prompt);
 await go(page,6);await page.locator('#prompt').fill(prompt+'\n自分で追記した文');await page.waitForTimeout(300);await page.reload();await page.waitForSelector('#sensor-list .device-item',{state:'attached'});assert.ok((await page.locator('#prompt').inputValue()).endsWith('自分で追記した文'));assert.equal(await page.locator('#copy').isDisabled(),false);
 await go(page,1);await page.locator('#purpose').fill('猫の水皿を管理');assert.equal(await page.locator('#copy').isDisabled(),true);await go(page,6);assert.equal(await page.locator('#stale').isVisible(),true);
 await go(page,3);await page.locator('[name=ai-mode][value=none]').check();await go(page,3);assert.equal(await page.locator('#ai-fields').isVisible(),false);await go(page,6);await page.locator('#generate').click();assert.ok(!(await page.locator('#prompt').inputValue()).includes('【Teachable Machine】'));
 await go(page,3);await page.locator('[name=ai-mode][value=image]').check();await go(page,3);await page.locator('#classes').fill(' 和猫 \nアメショー');await go(page,6);await page.locator('#generate').click();assert.ok((await page.locator('#prompt').inputValue()).includes('[" 和猫 ","アメショー"]'));
 await go(page,3);await page.locator('#classes').fill('Cat1\nCat1');await go(page,6);await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/重複/);
 await go(page,3);await page.locator('#classes').fill('Cat1\n\nCat2');await go(page,6);await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/空の行/);
 await go(page,3);await page.locator('#classes').fill('Cat1\nCat2');
 await go(page,2);await page.locator('#sensor-catalog button[data-device-id=soil]').click();let extra=page.locator('#sensor-list .device-item').last();await extra.locator('select').selectOption('P1');await go(page,6);await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/P1.*重複/);
 await go(page,2);await extra.getByRole('button',{name:/削除/}).click();assert.equal(await page.locator('#sensor-list .device-item').count(),2);
 await go(page,2);await page.locator('#sensor-catalog button[data-device-id=distance]').click();extra=page.locator('#sensor-list .device-item').last();assert.equal(await extra.locator('select').count(),2);await extra.locator('select').nth(0).selectOption('P0');await extra.locator('select').nth(1).selectOption('P2');
 await go(page,6);await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/距離をcmで得る手順は未確認/);
 await go(page,1);await page.locator('#purpose').fill('<img src=x onerror=alert(1)>');await go(page,6);await page.locator('#generate').click();assert.equal(await page.locator('img[src="x"]').count(),0);assert.ok((await page.locator('#prompt').inputValue()).includes('<img src=x onerror=alert(1)>'));
 // Deleting all text must leave the editable result visible.
 const beforeClear=await page.locator('#prompt').inputValue();await go(page,6);await page.locator('#prompt').fill('');assert.equal(await page.locator('#result').isVisible(),true);assert.equal(await page.locator('#copy').isDisabled(),true);await go(page,6);await page.locator('#prompt').fill(beforeClear);
 // Clipboard denial must offer manual selection without losing the text.
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}}));await go(page,6);await page.locator('#copy').click();assert.match(await page.locator('#action-status').textContent(),/Ctrl＋C/);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const m=await mobile.newPage();await m.goto(base);await m.waitForSelector('#sensor-choice optgroup',{state:'attached'});assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await m.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));});await m.screenshot({animations:'disabled',path:'work/mobile.png',fullPage:true});await go(m,2);await m.locator('#step2').screenshot({animations:'disabled',path:'work/mobile-sensors.png'});await m.getByRole('button',{name:/既製品：夜間防犯ライト/}).click();assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.close();
 // Storage unavailable/corrupt must not prevent editing.
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));const b=await blocked.newPage();await b.goto(base);await b.waitForSelector('#sensor-choice optgroup',{state:'attached'});assert.match(await b.locator('#save-status').textContent(),/保存できません/);await b.locator('#purpose').fill('動く装置');await blocked.close();
 const corrupt=await browser.newContext();const c=await corrupt.newPage();await c.goto(base);await c.evaluate(()=>localStorage.setItem('b2s-prompt-maker-v1','{broken'));await c.reload();assert.match(await c.locator('#save-status').textContent(),/読み取れません/);await corrupt.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: all device images/grouping, keyboard/multiple additions, connection fields, legacy storage, prompt parity, Chromebook layouts, desktop/mobile layout, S/A separation, sample, required fields, pins, AI classes, edited prompt persistence, stale-copy prevention, clipboard/fallback, storage errors, no external requests, no page errors.');
}catch(error){
 // Surface the actual failure in Actions annotations as well as the full log.
 if(process.env.GITHUB_ACTIONS){
  const message=String(error.stack||error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
  console.error('::error title=Browser test failure::'+message);
 }
 throw error;
}finally{await browser.close();}
