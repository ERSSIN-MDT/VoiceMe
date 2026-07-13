import {createReadStream,existsSync} from 'node:fs';
import {extname,join,normalize} from 'node:path';
import {createServer} from 'node:http';
import room from './api/room.js';
import signal from './api/signal.js';
import ice from './api/ice.js';

const root=process.cwd(),port=Number(process.env.PORT||8000),MAX_BODY=65536;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const handlers={'/api/room':room,'/api/signal':signal,'/api/ice':ice};
const cors=native=>{native.setHeader('access-control-allow-origin','*');native.setHeader('access-control-allow-methods','GET,POST,OPTIONS');native.setHeader('access-control-allow-headers','content-type')};

function response(native){return{status(code){native.statusCode=code;return this},json(data){native.setHeader('content-type','application/json; charset=utf-8');native.end(JSON.stringify(data))}}}
async function body(request){let value='',bytes=0;for await(const chunk of request){bytes+=Buffer.byteLength(chunk);if(bytes>MAX_BODY)throw Object.assign(new Error('Payload too large'),{statusCode:413});value+=chunk}return value?JSON.parse(value):{}}
createServer(async(request,native)=>{
  const url=new URL(request.url,`http://${request.headers.host}`),handler=handlers[url.pathname];
  if(handler){
    cors(native);
    if(request.method==='OPTIONS'){native.statusCode=204;native.end();return}
    try{await handler({method:request.method,body:request.method==='POST'?await body(request):undefined,query:Object.fromEntries(url.searchParams)},response(native))}
    catch(error){const code=error.statusCode||400;native.statusCode=code;native.setHeader('content-type','application/json');native.end(JSON.stringify({error:error.message||'Invalid request'}))}
    return;
  }
  const requested=url.pathname.startsWith('/join/')?'/index.html':url.pathname==='/'?'/index.html':url.pathname;
  const file=normalize(join(root,requested));
  if(!file.startsWith(root)||!existsSync(file)){native.statusCode=404;native.end('Not found');return}
  native.setHeader('content-type',types[extname(file)]||'application/octet-stream');createReadStream(file).pipe(native);
}).listen(port,()=>console.log(`VoiceMe server: http://localhost:${port}`));
