"use client";
import {appRequest} from "@/lib/client-request";
import {useId,useState} from "react";
import {Download,Upload,Database} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "@/components/ui/alert-dialog";
import {toast} from "sonner";
import {Backup,MAX_BACKUP_BYTES,backupSummary,validateBackup} from "@/lib/backup-format";
import {today} from "@/lib/analytics";

export default function BackupControls({onRestored}:{onRestored:()=>void}){
 const id=useId();
 const [busy,setBusy]=useState<"export"|"read"|"import"|null>(null),[error,setError]=useState("");
 const [backup,setBackup]=useState<Backup|null>(null),[filename,setFilename]=useState(""),[open,setOpen]=useState(false);
 async function download(){
  setBusy("export");setError("");
  try{
   const r=await appRequest("/api/backup",{cache:"no-store"});
   if(!r.ok){const d=await r.json() as {error?:string};throw new Error(d.error??"Не удалось экспортировать данные.")}
   const blob=await r.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download=`Аналитика-руководства-${today()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   toast.success("Резервная копия подготовлена для скачивания");
  }catch(e){setError(e instanceof Error?e.message:"Не удалось экспортировать данные.")}finally{setBusy(null)}
 }
 async function choose(file?:File){
  setBackup(null);setFilename(file?.name??"");setError("");if(!file)return;setBusy("read");
  try{if(file.size>MAX_BACKUP_BYTES)throw new Error("Размер файла не должен превышать 10 МБ.");const data=validateBackup(JSON.parse((await file.text()).replace(/^\uFEFF/,"")));setBackup(data)}catch(e){setError(e instanceof SyntaxError?"Файл повреждён: не удалось прочитать JSON.":e instanceof Error?e.message:"Не удалось прочитать файл.")}finally{setBusy(null)}
 }
 async function restore(){
  if(!backup)return;setBusy("import");setError("");
  try{const r=await appRequest("/api/backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(backup)});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error??"Не удалось восстановить данные.");setOpen(false);setBackup(null);setFilename("");toast.success("Все данные восстановлены из файла");onRestored()}catch(e){setError(e instanceof Error?e.message:"Не удалось восстановить данные.")}finally{setBusy(null)}
 }
 return <section className="panel backup-panel"><div className="panel-heading"><div><h2><Database aria-hidden size={18}/> Резервная копия</h2><p>Экспорт и восстановление всех данных сайта</p></div></div><div className="backup-body"><p className="backup-description">Один файл содержит рабочие и учебные данные: учителей, учеников, группы с расписанием, все проверки, попытки экзаменов и настройки расчётов.</p><div className="backup-actions"><Button type="button" variant="outline" disabled={!!busy} onClick={download}><Download aria-hidden size={16}/>{busy==="export"?"Подготавливаем файл…":"Экспорт всех данных"}</Button></div><div className="backup-import"><label htmlFor={id}>Файл резервной копии для восстановления</label><Input id={id} type="file" accept=".json,application/json" disabled={!!busy} onChange={e=>void choose(e.target.files?.[0])}/><p className="small-muted">Выберите ранее экспортированный файл JSON, до 10 МБ.</p></div>{busy==="read"&&<p role="status">Проверяем файл…</p>}{backup&&<><p className="backup-filename">Готов к восстановлению: <b>{filename}</b></p><div className="backup-summary">{backupSummary(backup).map(s=><div key={s.dataset}><b>{s.label}</b><span>Учителя: {s.teachers} · Ученики: {s.students}</span><span>Группы: {s.groups}</span><span>Проверки: {s.checks} · Экзамены: {s.exams}</span><span>Настройки расчётов включены</span></div>)}</div><Button type="button" disabled={!!busy} onClick={()=>{setError("");setOpen(true)}}><Upload aria-hidden size={16}/>Импорт — восстановить все данные</Button></>}{error&&!open&&<p className="form-error" role="alert">{error}</p>}</div><AlertDialog open={open} onOpenChange={v=>{if(busy!=="import")setOpen(v)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Восстановить все данные из файла?</AlertDialogTitle><AlertDialogDescription>Текущие рабочие и учебные данные, включая настройки, будут заменены содержимым выбранной резервной копии. Записи, которых нет в файле, исчезнут. При необходимости сначала экспортируйте текущие данные.</AlertDialogDescription></AlertDialogHeader>{error&&<p className="form-error" role="alert">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy==="import"}>Отмена</AlertDialogCancel><AlertDialogAction disabled={busy==="import"} onClick={e=>{e.preventDefault();void restore()}}>{busy==="import"?"Восстанавливаем…":"Восстановить все данные"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></section>;
}
