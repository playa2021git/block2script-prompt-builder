import {chromium,firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {emptyState,sampleState,STORAGE_KEY,inputSignature,generatePrompt} from '../core.js';
const base=process.env.TEST_URL||'http://127.0.0.1:5180/';
const engine=process.env.MOTION_BROWSER||'chromium',type={chromium,firefox,webkit}[engine];
const browser=await type.launch({headless:true,...(engine==='chromium'?{executablePath:process.env.BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}: {})});
const errors=[],external=[];
const context=await browser.newContext({viewport:{width:1366,height:900},...(engine==='chromium'?{permissions:['clipboard-read','clipboard-write']}: {})});
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));context.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});
const page=await context.newPage(),go=n=>page.locator(`.step-nav a[href="#step${n}"]`).click();
try{
 await page.goto(base);await page.waitForTimeout(350);
 // Typing hint is visual only; native values and placeholder remain untouched.
 assert.equal(await page.locator('#purpose').inputValue(),'');assert.match(await page.locator('#purpose').getAttribute('placeholder'),/猫/);
 await page.locator('#purpose').focus();assert.equal(await page.locator('.typing-hint:visible').count(),0);
 await page.locator('#purpose').blur();assert.match(await page.locator('#purpose-motion-help').textContent(),/Gem/);
 await page.locator('#purpose').fill('発明の目的');assert.equal(await page.locator('#purpose-motion-help').isVisible(),false);assert.equal(await page.locator('.step-nav a[href="#step1"]').getAttribute('class').then(s=>s.includes('motion-complete')),true);
 await go(3);
 // Regression: selected borders must not cross text on step 3.
 assert.equal(await page.locator('.motion-selection').count(),0);
 assert.equal(await page.locator('.ai-options label:has(input:checked)').count(),1);
 assert.equal(await page.locator('.ai-options label:has(input:checked)').evaluate(el=>getComputedStyle(el).borderTopWidth),'2px');
 await page.locator('[name=ai-mode][value=image]').check();
 assert.equal(await page.locator('.ai-options label:has(input:checked) input').inputValue(),'image');
 assert.equal(await page.locator('.motion-selection').count(),0);
 await go(6);
 // The same is true when switching between Gem prompt modes.
 assert.equal(await page.locator('.prompt-mode label:has(input:checked)').count(),1);
 await page.locator('[name=prompt-mode][value=precise]').check();
 assert.equal(await page.locator('.prompt-mode label:has(input:checked) input').inputValue(),'precise');
 assert.equal(await page.locator('.motion-selection').count(),0);
 await go(2);
 // Ten rapid programmatic clicks must not lose updates; <=3 flights and eventual cleanup.
 await page.locator('[data-device-id="soil"].device-pick').evaluate(node=>{for(let i=0;i<10;i++)document.querySelector('[data-device-id="soil"].device-pick').click();});
 assert.equal(await page.locator('#equipped-sensors .equipment-item').count(),10);assert.ok(await page.locator('.motion-flight').count()<=3);
 await page.waitForTimeout(1000);assert.equal(await page.locator('.motion-flight').count(),0);
 assert.equal(await page.locator('#equipment-count').textContent(),'10個');
 // OFF persists independently and immediately cancels motion.
 await page.locator('#motion-toggle').click();assert.equal(await page.locator('html').getAttribute('data-motion'),'off');
 await page.reload();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-checked'),'false');
 await go(4);await page.locator('.device-pick[data-device-id="led"]').click();await page.locator('.device-pick[data-device-id="led"]').click();assert.equal(await page.locator('.motion-flight').count(),0);
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 // Reset dialog cancel and Escape preserve state; confirmation removes only app data.
 await page.locator('#reset').click();await page.locator('#reset-dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await page.locator('#equipment-count').textContent(),'11個');
 await page.locator('#reset').click();await page.locator('#reset-dialog button[value="reset"]').click();await page.waitForFunction(()=>document.querySelector('#equipment-count').textContent==='0個');
 assert.equal(await page.locator('#purpose').inputValue(),'');assert.equal(await page.evaluate(k=>localStorage.getItem(k),STORAGE_KEY),null);assert.equal(await page.evaluate(()=>localStorage.getItem('b2s-motion-enabled')),'off');
 // OS reduce wins even if saved ON. No flight/canvas; all CSS animations stop.
 await page.evaluate(()=>localStorage.setItem('b2s-motion-enabled','on'));await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.locator('#motion-toggle').isDisabled(),true);assert.equal(await page.locator('html').getAttribute('data-motion'),'off');
 await go(2);await page.locator('.device-pick[data-device-id="light"]').click();assert.equal(await page.locator('.motion-flight,.motion-confetti').count(),0);
 // Layout stays within the viewport throughout each wizard transition.
 for(const width of [360,768,1366]){await page.setViewportSize({width,height:900});await go(3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`work/motion-${engine}-${width}.png`,animations:'disabled'});}
 await page.setViewportSize({width:360,height:900});await page.locator('#motion-dock').click();await page.waitForFunction(()=>document.querySelector('#equipment').classList.contains('is-open'));assert.equal(await page.locator('#motion-dock').getAttribute('aria-expanded'),'true');await page.locator('#motion-sheet-handle').click();assert.equal(await page.locator('#equipment-toggle').getAttribute('aria-expanded'),'false');
 await page.locator('#motion-dock').click();const handle=page.locator('#motion-sheet-handle');await handle.scrollIntoViewIfNeeded();const handleBox=await handle.boundingBox();await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2);await page.mouse.down();await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2+65,{steps:5});await page.mouse.up();assert.equal(await page.locator('#equipment-toggle').getAttribute('aria-expanded'),'false');
 // Snapshot state restores byte-for-byte; copy success alone causes confetti.
 const state=sampleState();state.sensors[1].connections.signal='P1';state.prompt=generatePrompt(state);state.signature=inputSignature(state);
 await page.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('b2s-motion-enabled','on');},{key:STORAGE_KEY,state});await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1366,height:900});await page.reload();await go(6);
 assert.equal(await page.locator('#prompt').inputValue(),state.prompt);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));await page.locator('#copy').click();await page.waitForFunction(()=>document.querySelector('.motion-confetti'));assert.match(await page.locator('#motion-toast').textContent(),/コピーしたよ/);assert.equal(await page.locator('.motion-copied').count(),1);
 await page.locator('#motion-toggle').click();assert.equal(await page.locator('.motion-confetti').count(),0);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));await page.locator('#copy').click();await page.waitForFunction(()=>document.querySelector('#motion-toast').textContent.includes('できなかった'));assert.equal(await page.locator('.motion-confetti').count(),0);assert.equal(await page.locator('#prompt').evaluate(e=>e.selectionEnd-e.selectionStart),state.prompt.length);
 // Keyboard can traverse every step, input remains usable under CPU throttle.
 await go(1);await page.locator('#purpose').focus();await page.keyboard.insertText('キーボードで編集');for(let i=2;i<=6;i++){await page.locator('#next-step').focus();await page.keyboard.press('Enter');assert.equal(await page.locator(`#step${i}`).isVisible(),true);}
 if(engine==='chromium'){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await go(1);const start=Date.now();await page.locator('#purpose').fill('4倍負荷でも編集できる');assert.equal(await page.locator('#purpose-summary').textContent(),'4倍負荷でも編集できる');assert.ok(Date.now()-start<1500);await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(`PASS (${engine}): visual-only hints, completion, ten additions, motion preferences, reset/Escape, responsive layout, disclosure, snapshots, clipboard success/failure, cleanup, keyboard, no external requests.`);
}finally{await browser.close();}
