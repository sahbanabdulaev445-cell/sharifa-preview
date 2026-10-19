"use client";
import {useEffect,useState} from "react";
import {Download,MessageCircle,Share2,Copy,ChevronLeft,ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {ShareReport,reportText} from "@/lib/share-report";
import "./lesson-records.css";

export async function cardPages(report:ShareReport):Promise<{url:string;file:File}[]>{
 await document.fonts?.ready;
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1440;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Не удалось подготовить изображение карточки.");
 ctx.font='26px "Segoe UI", Arial, sans-serif';
 const wrap=(text:string,width:number)=>{const out:string[]=[];for(const paragraph of text.split("\n")){let line="";for(const word of paragraph.split(/\s+/)){if(ctx.measureText((line+" "+word).trim()).width>width&&line){out.push(line);line=""}if(ctx.measureText(word).width>width){for(const ch of word){if(ctx.measureText(line+ch).width>width){out.push(line);line=""}line+=ch}}else line=(line+" "+word).trim()}out.push(line)}return out};
 const lines=report.lines.flatMap(line=>wrap(line,928)),pages=Math.max(1,Math.ceil(lines.length/27)),files=[];
 for(let page=0;page<pages;page++){
  ctx.fillStyle="#f2f6fa";ctx.fillRect(0,0,1080,1440);ctx.fillStyle="#ffffff";ctx.fillRect(30,30,1020,1380);ctx.fillStyle="#004175";ctx.fillRect(30,30,1020,15);
  ctx.fillStyle="#004175";ctx.font='bold 22px "Segoe UI", Arial, sans-serif';ctx.fillText("SHARIFA · АНАЛИТИКА РУКОВОДСТВА",76,97);
  ctx.font='bold 38px "Segoe UI", Arial, sans-serif';const title=wrap(report.title,928);
  title.slice(0,3).forEach((s,i)=>ctx.fillText(s,76,161+i*47));
  ctx.font='23px "Segoe UI", Arial, sans-serif';ctx.fillStyle="#5d7488";ctx.fillText(report.subtitle,76,190+Math.min(title.length,3)*47);
  ctx.strokeStyle="#dce7f0";ctx.beginPath();ctx.moveTo(76,360);ctx.lineTo(1004,360);ctx.stroke();
  ctx.font='26px "Segoe UI", Arial, sans-serif';ctx.fillStyle="#24465f";
  lines.slice(page*27,(page+1)*27).forEach((line,i)=>{
   const y=407+i*33,heading=["СРЕДНИЕ ОЦЕНКИ","ИСТОРИЯ УРОКОВ","СРЕДНИЕ ОЦЕНКИ УЧЕНИКОВ"].includes(line),date=/^\d{2}\.\d{2}\.\d{4}/.test(line);
   if(heading){ctx.fillStyle="#edf4fa";ctx.fillRect(63,y-26,954,33)}
   ctx.font=`${heading||date?"bold ":""}${heading?22:line.startsWith("Комментарий:")?24:26}px "Segoe UI", Arial, sans-serif`;
   ctx.fillStyle=heading||date?"#004175":line.startsWith("Джуз ")?"#356b55":line.startsWith("Комментарий:")?"#5d7488":"#24465f";
   ctx.fillText(line,76,y);
  });
  ctx.strokeStyle="#dce7f0";ctx.beginPath();ctx.moveTo(76,1332);ctx.lineTo(1004,1332);ctx.stroke();
  ctx.font='20px "Segoe UI", Arial, sans-serif';ctx.fillStyle="#5d7488";ctx.fillText(`Страница ${page+1} из ${pages} · Оценки по шкале до 10`,76,1370);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Не удалось создать PNG")),"image/png"));
  files.push({url:URL.createObjectURL(blob),file:new File([blob],`${report.filename}-${page+1}.png`,{type:"image/png"})});
 }
 return files;
}
export default function ShareReportDialog({report,onClose}:{report:ShareReport;onClose:()=>void}){
 const [pages,setPages]=useState<{url:string;file:File}[]>([]),[page,setPage]=useState(0),[text,setText]=useState(()=>reportText(report)),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let closed=false,urls:string[]=[];cardPages(report).then(result=>{urls=result.map(p=>p.url);if(closed)urls.forEach(URL.revokeObjectURL);else setPages(result)}).catch(e=>{if(!closed)setError(e.message)});return()=>{closed=true;urls.forEach(URL.revokeObjectURL)}},[report]);
 async function share(){setMessage("");setError("");const files=pages.map(p=>p.file);if(!navigator.canShare?.({files})||!navigator.share){setMessage("Этот браузер не отправляет изображения напрямую. Скачайте карточки и прикрепите их в WhatsApp либо отправьте текст кнопкой ниже.");return}setBusy(true);try{await navigator.share({files,title:report.title})}catch(e){if((e as Error).name!=="AbortError")setError("Не удалось открыть отправку. Скачайте карточку и прикрепите её в WhatsApp.")}finally{setBusy(false)}}
 function download(){pages.forEach((p,i)=>{const a=document.createElement("a");a.href=p.url;a.download=p.file.name;setTimeout(()=>a.click(),i*180)});setMessage("Карточки подготовлены для скачивания. Их можно прикрепить в чате WhatsApp.")}
 async function copy(){try{await navigator.clipboard.writeText(text);setMessage("Текст скопирован. Можно вставить его в любой чат.")}catch{setError("Не удалось скопировать автоматически. Выделите текст ниже и скопируйте его.")}}
 return <Dialog open onOpenChange={v=>{if(!v&&!busy)onClose()}}><DialogContent className="form-dialog share-card-dialog"><DialogHeader><DialogTitle>Отправить карточку</DialogTitle><DialogDescription>Проверьте содержимое. Получателя выберите в WhatsApp или меню отправки.</DialogDescription></DialogHeader><div className="share-card-layout"><div className="share-card-preview">{pages[page]?<img src={pages[page].url} alt={`Предпросмотр карточки ${report.title}, страница ${page+1}`}/>:<p role="status">Подготавливаем карточку…</p>}{pages.length>1&&<div><Button type="button" variant="outline" aria-label="Предыдущая страница" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></Button><span>{page+1} / {pages.length}</span><Button type="button" variant="outline" aria-label="Следующая страница" disabled={page===pages.length-1} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></Button></div>}</div><div className="share-card-actions"><Button type="button" disabled={!pages.length||busy} onClick={share}><Share2 size={17}/>Поделиться карточкой</Button><Button type="button" variant="outline" disabled={!pages.length||busy} onClick={download}><Download size={17}/>Скачать {pages.length>1?`карточки (${pages.length})` :"PNG"}</Button><p>На телефоне выберите WhatsApp в меню «Поделиться». На компьютере можно скачать PNG и прикрепить к сообщению.</p><label htmlFor="share-report-text">Текст для сообщения</label><textarea id="share-report-text" value={text} onChange={e=>setText(e.target.value)} rows={8}/><Button type="button" variant="outline" onClick={copy}><Copy size={16}/>Скопировать текст</Button><Button type="button" disabled={!text.trim()||text.length>6000} onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer")}><MessageCircle size={17}/>Отправить текст в WhatsApp</Button>{text.length>6000&&<p>Текст длиннее 6000 символов. Сократите его или отправьте полные карточки изображениями.</p>}<small>Изменение текста здесь влияет только на сообщение. PNG содержит исходный отчёт за выбранный период.</small></div></div>{message&&<p className="share-card-message" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}</DialogContent></Dialog>;
}
