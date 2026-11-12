import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {emptyState,makeItem,STORAGE_KEY,generatePrompt} from '../core.js';
import {securityState} from './fixtures/security.mjs';
const base=process.env.TEST_URL||'http://127.0.0.1:5180/';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const errors=[],external=[];
async function open(state){
 const context=await browser.newContext({viewport:{width:1366,height:900},storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:STORAGE_KEY,value:JSON.stringify(state)}]}]}});
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));context.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});
 const page=await context.newPage();await page.goto(base);return {page,context};
}
const go=(p,n)=>p.locator(`.step-nav a[href="#step${n}"]`).click();
try{
 const legacy=emptyState();delete legacy.promptMode;legacy.purpose='明るさを調べる';legacy.behavior='明るさを表示する';legacy.sensors=[makeItem('light','one'),makeItem('light','two')];legacy.prompt='以前の編集を残す';legacy.signature=JSON.stringify([legacy.purpose,legacy.sensors,legacy.actuators,legacy.ai,legacy.behavior]);
 const {page:p,context:c}=await open(legacy);await go(p,6);
 assert.equal(await p.locator('[name=prompt-mode][value=auto]').isChecked(),true);assert.equal(await p.locator('#prompt').inputValue(),legacy.prompt);assert.equal(await p.locator('#copy').isDisabled(),true);
 assert.equal(await p.locator('#equipped-sensors .equipment-item').count(),2);assert.equal(await p.locator('#equipped-sensors [data-kind=duplicate]').count(),2);
 await go(p,2);const light=p.locator('.device-pick[data-device-id=light]');await light.click();assert.equal(await p.locator('#equipped-sensors .equipment-item').count(),2);assert.equal(await p.locator('.equipment-highlight').count(),1);
 await p.locator('#equipped-sensors .equipment-item').last().getByRole('button',{name:/外す/}).click();assert.equal(await p.locator('#equipped-sensors [data-kind=duplicate]').count(),0);
 await light.click();assert.equal(await p.locator('#equipped-sensors .equipment-item').count(),1);
 await p.locator('#step2 .compact-picker summary').click();await p.locator('#sensor-choice').selectOption('light');await p.locator('#add-sensor').click();assert.equal(await p.locator('#equipped-sensors .equipment-item').count(),1);
 const soil=p.locator('.device-pick[data-device-id=soil]');await soil.click();await soil.click();assert.equal(await p.locator('#equipped-sensors [data-device-id=soil]').count(),2);
 assert.match(await p.locator('#equipped-sensors [data-device-id=soil]').last().textContent(),/入力が必要/);
 await c.close();
 const {page,context}=await open(securityState());await go(page,6);
 assert.match(await page.locator('#equipped-ai').textContent(),/モデルURL未入力/);
 await page.locator('#generate').click();assert.equal(await page.locator('#prompt').inputValue(),generatePrompt(securityState()));
 await page.locator('[name=prompt-mode][value=precise]').check();assert.equal(await page.locator('#copy').isDisabled(),true);assert.equal(await page.locator('#stale').isVisible(),true);
 await page.locator('#generate').click();assert.equal(await page.locator('#prompt').inputValue(),generatePrompt(securityState('precise')));
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'{}').promptMode==='precise',STORAGE_KEY);
 await page.reload();await page.waitForSelector('[name=prompt-mode]');assert.equal(await page.locator('[name=prompt-mode][value=precise]').isChecked(),true);assert.equal(await page.locator('#copy').isDisabled(),false);
 await page.locator('[name=prompt-mode][value=auto]').check();await page.locator('#generate').click();
 await mkdir('work',{recursive:true});await page.evaluate(()=>{scrollTo(0,0);document.getElementById('equipment').scrollTop=0;});await page.screenshot({path:'work/gem-modes.png',animations:'disabled'});
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: built-in re-selection and legacy duplicates, external multiples, old edited prompt preservation, mode switching/staleness/persistence, security-model prompts and missing model URL.');
}catch(error){if(process.env.GITHUB_ACTIONS)console.error('::error title=Gem integration tests::'+String(error.stack||error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));throw error;}finally{await browser.close();}
