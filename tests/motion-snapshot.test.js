import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validate,generatePrompt} from '../core.js';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/motion-prompts.json',import.meta.url),'utf8'));
test('モーション導入前の空入力・防犯ライト・水やりと、検証結果・指示文が完全一致',()=>{
 for(const fixture of fixtures){assert.deepEqual(validate(fixture.state).errors,fixture.errors);if(fixture.prompt===null)assert.throws(()=>generatePrompt(fixture.state));else assert.equal(Buffer.compare(Buffer.from(generatePrompt(fixture.state)),Buffer.from(fixture.prompt)),0);}
});
