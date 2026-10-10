import {getChatGPTUser} from "@/app/chatgpt-auth";
import {exportBackup,restoreBackup} from "@/lib/backup-storage";
import {MAX_BACKUP_BYTES,validateBackup} from "@/lib/backup-format";
export const dynamic="force-dynamic";
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(){
 if(!await getChatGPTUser())return reply({error:"Войдите в сайт, чтобы экспортировать данные."},401);
 try{const backup=await exportBackup();return new Response(JSON.stringify(backup),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="director-analytics-backup-${backup.exportedAt.slice(0,10)}.json"`,"Cache-Control":"no-store"}})}catch(error){console.error("Export backup",error);return reply({error:"Не удалось экспортировать данные. Попробуйте ещё раз."},503)}
}

export async function POST(req:Request){
 if(!await getChatGPTUser())return reply({error:"Сессия завершена. Обновите страницу и войдите снова."},401);
 if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Недопустимый источник запроса."},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return reply({error:"Выберите файл резервной копии JSON."},415);
 if(Number(req.headers.get("content-length"))>MAX_BACKUP_BYTES)return reply({error:"Размер файла не должен превышать 10 МБ."},413);
 let backup;
 try{
  const reader=req.body?.getReader();if(!reader)return reply({error:"Файл резервной копии пуст."},400);
  const chunks:Uint8Array[]= [];let bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BACKUP_BYTES){await reader.cancel();return reply({error:"Размер файла не должен превышать 10 МБ."},413)}chunks.push(value)}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
  const text=new TextDecoder("utf-8",{fatal:true}).decode(buffer).replace(/^\uFEFF/,"");
  backup=validateBackup(JSON.parse(text));
 }catch(error){return reply({error:error instanceof SyntaxError?"Файл повреждён: не удалось прочитать JSON.":error instanceof Error?error.message:"Не удалось прочитать резервную копию."},400)}
 try{const records=await restoreBackup(backup);return reply({ok:true,records})}catch(error){console.error("Restore backup",error);return reply({error:"Не удалось восстановить данные. Замена не завершена; попробуйте ещё раз."},503)}
}
