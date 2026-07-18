const base=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
export const json=(res,status,data)=>res.status(status).json(data);
export function validRoom(room){return typeof room==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(room)}
export function validName(name){return typeof name==='string'&&name.trim().length>0&&name.trim().length<=48}
export function key(room){return `voiceme:room:${room}`}
export async function redis(command){if(!base||!token)throw new Error('SIGNALING_NOT_CONFIGURED');const response=await fetch(base,{method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(command)});const body=await response.json();if(!response.ok||body.error)throw new Error(body.error||'REDIS_ERROR');return body.result}
export async function getRoom(room){const value=await redis(['GET',key(room)]);return value?JSON.parse(value):null}
export async function setRoom(room,value){await redis(['SET',key(room),JSON.stringify(value),'EX','90'])}
export async function removeRoom(room){await redis(['DEL',key(room)])}
export async function withLock(room,operation){const lock=`${key(room)}:lock`,owner=crypto.randomUUID();for(let i=0;i<12;i++){if(await redis(['SET',lock,owner,'NX','PX','5000'])){try{return await operation()}finally{await redis(['EVAL',"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",'1',lock,owner])}}await new Promise(resolve=>setTimeout(resolve,80))}throw new Error('ROOM_BUSY')}
export function active(room){return room?.participants.filter(p=>Date.now()-p.seen<10000)||[]}
