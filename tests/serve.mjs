// Local preview/test server only. GitHub Pages serves the static files in production.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('.'),base=process.env.BASE_PATH||'/',port=Number(process.env.PORT||5180);
if(!base.startsWith('/')||!base.endsWith('/'))throw new Error('BASE_PATH must start and end with /');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.png':'image/png'};
createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith(base)){res.writeHead(404);res.end();return;}
  const relative=pathname.slice(base.length)||'index.html';
  const path=resolve(root,relative);
  if(!path.startsWith(root+sep)||relative.split('/').some(s=>s.startsWith('.')||['node_modules','work'].includes(s))){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}${base}`));
