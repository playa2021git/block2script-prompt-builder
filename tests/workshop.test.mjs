import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {generatePrompt,restoreState,STORAGE_KEY} from '../core.js';
const base=process.env.TEST_URL||'http://127.0.0.1:5180/';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1366,height:900},permissions:['clipboard-read','clipboard-write']});
const errors=[],external=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
context.on('request',r=>{if(!r.url().startsWith(new URL(base).origin))external.push(r.url());});
const page=await context.newPage();
const go=async n=>{await page.locator(`.step-nav a[href="#step${n}"]`).click();assert.equal(await page.locator('#builder > .card:visible').count(),1);assert.equal(await page.locator('.step-nav [aria-current=step]').getAttribute('href'),'#step'+n);};
const equip=(group,id)=>page.locator(`#equipped-${group} .equipment-item[data-device-id="${id}"]`);
const pick=id=>page.locator(`.device-pick[data-device-id="${id}"]`);
const selectPin=async value=>page.locator('.device-item:visible .connection-fields select').selectOption(value);
const loadImages=async()=>page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode()));});
await mkdir('work',{recursive:true});
try{
 await page.goto(base);
 for(let n=1;n<=6;n++)await go(n);
 await go(1);await page.locator('#purpose').fill('植物が乾いたら水をあげる');
 assert.equal(await page.locator('#purpose-summary').textContent(),'植物が乾いたら水をあげる');
 await go(2);assert.equal(await page.locator('#actuator-catalog').isVisible(),false);
 await pick('soil').click();assert.equal(await equip('sensors','soil').count(),1);
 assert.match(await equip('sensors','soil').textContent(),/未設定/);
 await selectPin('P1');assert.match(await equip('sensors','soil').textContent(),/P1/);
 await page.locator('.device-item:visible .device-memo').fill('水やり用');await page.locator('.device-item:visible .device-memo').press('Enter');
 assert.equal(await page.locator('#step2').isVisible(),true);assert.equal(await page.locator('#prompt').inputValue(),'');
 assert.match(await equip('sensors','soil').locator('.equipment-status').textContent(),/入力済み/);
 await go(3);assert.equal(await page.locator('#sensor-catalog').isVisible(),false);
 await pick('pump').click();await selectPin('P1');
 assert.match(await equip('actuators','pump').locator('.equipment-status').textContent(),/入力を確認/);
 assert.match(await equip('actuators','pump').locator('.equipment-issues').textContent(),/P1.*重複/);
 await selectPin('P2');assert.match(await equip('actuators','pump').locator('.equipment-status').textContent(),/入力済み/);
 // Equipment editing opens the exact device and step, even from the final stage.
 await go(6);await equip('sensors','soil').getByRole('button',{name:/編集/}).click();
 assert.equal(await page.locator('#step2').isVisible(),true);assert.equal(await page.locator('.device-item:visible').count(),1);
 assert.equal(await page.locator('.device-item:visible select').inputValue(),'P1');
 await pick('soil').focus();await page.keyboard.press('Enter');
 assert.equal(await equip('sensors','soil').count(),2);
 await equip('sensors','soil').last().getByRole('button',{name:/外す/}).click();
 assert.equal(await equip('sensors','soil').count(),1);
 await pick('buttons').click();assert.equal(await page.locator('.device-item:visible .connection-fields').count(),0);
 await equip('sensors','buttons').getByRole('button',{name:/外す/}).click();
 await go(4);await page.locator('[name=ai-mode][value=image]').check();
 const classes=' Cat1 \nnone';await page.locator('#classes').fill(classes);
 assert.equal(await page.locator('.equipment-classes').textContent(),JSON.stringify(classes.split('\n')));
 assert.match(await page.locator('#equipment-overview').textContent(),/画像認識/);
 await go(5);const behavior='土が乾いていてCat1のときに給水。2秒で止め、再給水はボタンで許可する。';await page.locator('#behavior').fill(behavior);
 assert.equal(await page.locator('#behavior-summary').textContent(),behavior);
 await go(6);await page.locator('#generate').click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'{}').prompt,STORAGE_KEY);
 const saved=await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
 assert.equal(await page.locator('#prompt').inputValue(),generatePrompt(restoreState(saved)));
 assert.match(await page.locator('#prompt').inputValue(),/信号（ON・OFF）：P2/);
 assert.equal(await page.locator('#equipment').isVisible(),true);
 await page.reload();await page.waitForSelector('#prompt');
 assert.equal(await equip('sensors','soil').count(),1);assert.equal(await equip('actuators','pump').count(),1);
 assert.match(await equip('actuators','pump').textContent(),/P2/);
 assert.equal(await page.locator('.equipment-classes').textContent(),JSON.stringify(classes.split('\n')));
 assert.match(await page.locator('#equipment-overview').textContent(),/画像認識/);
 // AI can be removed without destroying the exact labels for a later re-selection.
 await page.getByRole('button',{name:'AIを外す',exact:true}).click();assert.match(await page.locator('#equipped-ai').textContent(),/使わない/);
 await go(4);await page.locator('[name=ai-mode][value=image]').check();assert.equal(await page.locator('#classes').inputValue(),classes);
 // Final validation links must open the hidden editor, not focus invisible controls.
 await equip('actuators','pump').getByRole('button',{name:/編集/}).click();await selectPin('');
 await go(6);await page.locator('#generate').click();await page.locator('#validation .issues:not(.warning) a').first().click();
 assert.equal(await page.locator('#step3').isVisible(),true);assert.equal(await page.locator('.device-item:visible').count(),1);
 await selectPin('P2');
 // An unverified device can be configured, but its B2S warning must remain.
 await go(2);await pick('distance').click();
 const selects=page.locator('.device-item:visible .connection-fields select');await selects.nth(0).selectOption('P0');await selects.nth(1).selectOption('P1');
 assert.match(await equip('sensors','distance').textContent(),/未確認/);
 await equip('sensors','distance').getByRole('button',{name:/外す/}).click();
 await loadImages();
 if(await page.locator('.device-item:visible .close-editor').count())await page.locator('.device-item:visible .close-editor').click();
 for(const width of [1366,1024,768,390]){
  await page.setViewportSize({width,height:width===1024?768:900});await go(2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(width>900){
   const boxes=await page.locator('.step-nav,#builder,#equipment').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right};}));
   assert.ok(boxes[0].right<boxes[1].x&&boxes[1].right<boxes[2].x);
   assert.equal(await page.locator('#equipment-content').isVisible(),true);
  }else{
   assert.equal(await page.locator('#equipment-content').isVisible(),false);
   await page.locator('#equipment-toggle').click();assert.equal(await page.locator('#equipment-content').isVisible(),true);
   if(width===390)await page.screenshot({animations:'disabled',path:'work/workshop-mobile-equipment.png'});
   await equip('actuators','pump').getByRole('button',{name:/編集/}).click();assert.equal(await page.locator('#step3').isVisible(),true);
   assert.equal(await page.locator('#equipment-content').isVisible(),false);await go(2);
  }
  await page.evaluate(()=>{scrollTo(0,0);document.getElementById('equipment').scrollTop=0;});await page.screenshot({animations:'disabled',path:`work/workshop-${width}.png`});
 }
 // Reduced-motion applies to both CSS and the optional flying-equipment animation.
 await page.setViewportSize({width:1366,height:900});await page.emulateMedia({reducedMotion:'reduce'});await go(2);
 await pick('buttons').focus();await page.keyboard.press('Space');
 assert.equal(await equip('sensors','buttons').count(),1);assert.equal(await page.locator('.equip-token').count(),0);
 assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 await page.screenshot({animations:'disabled',path:'work/workshop-reduced-motion.png'});
 await go(6);await page.locator('#generate').click();await page.screenshot({animations:'disabled',path:'work/workshop-prompt.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: workshop navigation, live S/A/AI equipment, exact Class names, editing/removal, pin conflicts, validation links, prompt parity, v1 restore, responsive columns/drawer, keyboard and reduced motion.');
}catch(error){
 // Surface the actual failure in Actions annotations as well as the full log.
 if(process.env.GITHUB_ACTIONS){
  const message=String(error.stack||error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
  console.error('::error title=Browser test failure::'+message);
 }
 throw error;
}finally{await browser.close();}
