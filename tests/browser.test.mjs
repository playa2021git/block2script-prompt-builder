import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const base=process.env.TEST_URL||'http://127.0.0.1:5180/';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1366,height:960},permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage(),errors=[],external=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
context.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});
await mkdir('work',{recursive:true});
try{
 await page.goto(base);await page.waitForSelector('#sensor-choice optgroup',{state:'attached'});
 assert.equal(await page.locator('#sensor-choice option').filter({hasText:'ポンプ'}).count(),0);
 assert.equal(await page.locator('#actuator-choice option').filter({hasText:'センサ'}).count(),0);
 assert.equal(await page.locator('#ai-fields').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'work/desktop.png'});
 await page.getByRole('button',{name:/猫の給水サンプル/}).click();
 assert.equal(await page.locator('#purpose').inputValue(),'猫の種類に応じて自動で水を出す装置');
 assert.equal(await page.locator('#classes').inputValue(),'C1\nC2\nD1\nD2\nnone');
 assert.equal(await page.locator('#sample-pump-signal').inputValue(),'');
 await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/信号/);assert.equal(await page.locator('#result').isVisible(),false);
 await page.locator('#sample-pump-signal').selectOption('P1');await page.locator('#generate').click();
 const prompt=await page.locator('#prompt').inputValue();assert.ok(prompt.includes('["C1","C2","D1","D2","none"]'));assert.ok(prompt.includes('信号（ON・OFF）：P1'));assert.ok(prompt.includes('専用プログラム'));
 await page.locator('#copy').click();await page.waitForFunction(()=>document.querySelector('#action-status').textContent.includes('コピーしました'));assert.match(await page.locator('#action-status').textContent(),/コピーしました/);assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),prompt);
 await page.locator('#prompt').fill(prompt+'\n自分で追記した文');await page.waitForTimeout(300);await page.reload();await page.waitForSelector('#sensor-list .device-item');assert.ok((await page.locator('#prompt').inputValue()).endsWith('自分で追記した文'));assert.equal(await page.locator('#copy').isDisabled(),false);
 await page.locator('#purpose').fill('猫の水皿を管理');assert.equal(await page.locator('#copy').isDisabled(),true);assert.equal(await page.locator('#stale').isVisible(),true);
 await page.locator('[name=ai-mode][value=none]').check();assert.equal(await page.locator('#ai-fields').isVisible(),false);await page.locator('#generate').click();assert.ok(!(await page.locator('#prompt').inputValue()).includes('【Teachable Machine】'));
 await page.locator('[name=ai-mode][value=image]').check();await page.locator('#classes').fill(' 和猫 \nアメショー');await page.locator('#generate').click();assert.ok((await page.locator('#prompt').inputValue()).includes('[" 和猫 ","アメショー"]'));
 await page.locator('#classes').fill('Cat1\nCat1');await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/重複/);
 await page.locator('#classes').fill('Cat1\n\nCat2');await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/空の行/);
 await page.locator('#classes').fill('Cat1\nCat2');
 await page.locator('#sensor-choice').selectOption('soil');await page.locator('#add-sensor').click();let extra=page.locator('#sensor-list .device-item').last();await extra.locator('select').selectOption('P1');await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/P1.*重複/);
 await extra.getByRole('button',{name:/削除/}).click();assert.equal(await page.locator('#sensor-list .device-item').count(),1);
 await page.locator('#sensor-choice').selectOption('distance');await page.locator('#add-sensor').click();extra=page.locator('#sensor-list .device-item').last();assert.equal(await extra.locator('select').count(),2);await extra.locator('select').nth(0).selectOption('P0');await extra.locator('select').nth(1).selectOption('P2');
 await page.locator('#generate').click();assert.match(await page.locator('#validation').textContent(),/距離をcmで得る手順は未確認/);
 await page.locator('#purpose').fill('<img src=x onerror=alert(1)>');await page.locator('#generate').click();assert.equal(await page.locator('img').count(),0);assert.ok((await page.locator('#prompt').inputValue()).includes('<img src=x onerror=alert(1)>'));
 // Deleting all text must leave the editable result visible.
 const beforeClear=await page.locator('#prompt').inputValue();await page.locator('#prompt').fill('');assert.equal(await page.locator('#result').isVisible(),true);assert.equal(await page.locator('#copy').isDisabled(),true);await page.locator('#prompt').fill(beforeClear);
 // Clipboard denial must offer manual selection without losing the text.
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}}));await page.locator('#copy').click();assert.match(await page.locator('#action-status').textContent(),/Ctrl＋C/);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const m=await mobile.newPage();await m.goto(base);await m.waitForSelector('#sensor-choice optgroup',{state:'attached'});assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await m.screenshot({path:'work/mobile.png',fullPage:true});await m.getByRole('button',{name:/猫の給水サンプル/}).click();assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.close();
 // Storage unavailable/corrupt must not prevent editing.
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));const b=await blocked.newPage();await b.goto(base);await b.waitForSelector('#sensor-choice optgroup',{state:'attached'});assert.match(await b.locator('#save-status').textContent(),/保存できません/);await b.locator('#purpose').fill('動く装置');await blocked.close();
 const corrupt=await browser.newContext();const c=await corrupt.newPage();await c.goto(base);await c.evaluate(()=>localStorage.setItem('b2s-prompt-maker-v1','{broken'));await c.reload();assert.match(await c.locator('#save-status').textContent(),/読み取れません/);await corrupt.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: desktop/mobile layout, S/A separation, sample, required fields, pins, AI classes, edited prompt persistence, stale-copy prevention, clipboard/fallback, storage errors, no external requests, no page errors.');
}finally{await browser.close();}
