import {active,getRoom,json,key,removeRoom,setRoom,validName,validRoom,withLock,redis} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  let body=req.body;if(typeof body==='string')try{body=JSON.parse(body)}catch{return json(res,400,{error:'Invalid request'})}
  const {action,room,id,name}=body||{};
  if(!validRoom(room)||typeof id!=='string')return json(res,400,{error:'Invalid room'});
  try{
    const result=await withLock(room,async()=>{
      let data=await getRoom(room),participants=active(data),found=participants.find(p=>p.id===id);
      if(action==='join'){
        if(!validName(name))throw new Error('Invalid display name');
        if(!found&&participants.length>=2)throw new Error('ROOM_FULL');
        const user={id,name:name.trim(),seen:Date.now()};
        participants=found?participants.map(p=>p.id===id?user:p):[...participants,user];
      }else if(action==='leave'){
        participants=participants.filter(p=>p.id!==id);
        if(!participants.length){await removeRoom(room);await redis(['DEL',`${key(room)}:signal:${id}`]);return{participants}}
      }else if(action==='heartbeat'){
        participants=participants.map(p=>p.id===id?{...p,seen:Date.now()}:p);
      }else if(action==='rename'){
        if(!validName(name))throw new Error('Invalid display name');
        participants=participants.map(p=>p.id===id?{...p,name:name.trim(),seen:Date.now()}:p);
      }else throw new Error('Invalid action');
      data={participants};await setRoom(room,data);return data;
    });
    return json(res,200,result);
  }catch(error){return json(res,error.message==='ROOM_FULL'?409:500,{error:error.message==='ROOM_FULL'?'ROOM_FULL':'Unable to update room'})}
}
