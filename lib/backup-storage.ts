import {db} from "./storage";
import {defaults} from "./analytics";
import {Backup,validateBackup} from "./backup-format";

export async function exportBackup():Promise<Backup> {
 const rows=await db().prepare("SELECT id, dataset, kind, payload FROM records WHERE dataset IN ('demo', 'work') ORDER BY dataset, kind, id").all<{id:string;dataset:"demo"|"work";kind:Backup["records"][number]["kind"];payload:string}>();
 const records:Backup["records"]=rows.results.map(({payload,...row})=>({...row,value:JSON.parse(payload)}));
 for(const dataset of ["demo","work"] as const){if(!records.some(r=>r.id===`${dataset}:settings`))records.push({id:`${dataset}:settings`,dataset,kind:"settings",value:{id:"settings",...structuredClone(defaults)}})}
 if(!records.some(r=>r.id==="demo:initialized"))records.push({id:"demo:initialized",dataset:"demo",kind:"marker",value:{}});
 return validateBackup({format:"sharifa-director-analytics",version:3,exportedAt:new Date().toISOString(),records});
}

export async function restoreBackup(input:unknown){
 const backup=validateBackup(input),database=db();
 const statements=[database.prepare("DELETE FROM records WHERE dataset IN ('demo', 'work')")];
 let chunk:string[]=[],bytes=2;
 const flush=()=>{if(!chunk.length)return;statements.push(database.prepare("INSERT INTO records (id, dataset, kind, payload) SELECT json_extract(value, '$.id'), json_extract(value, '$.dataset'), json_extract(value, '$.kind'), json_extract(value, '$.payload') FROM json_each(?)").bind(`[${chunk.join(",")}]`));chunk=[];bytes=2};
 const encoder=new TextEncoder();
 for(const {value,...row} of backup.records){const encoded=JSON.stringify({...row,payload:JSON.stringify(value)}),size=encoder.encode(encoded).length+1;if(size>500000)throw new Error("Одна из записей в копии слишком велика.");if(bytes+size>500000)flush();chunk.push(encoded);bytes+=size}
 flush();
 // One D1 batch commits the replacement together or rolls the entire operation back.
 await database.batch(statements);
 return backup.records.length;
}
