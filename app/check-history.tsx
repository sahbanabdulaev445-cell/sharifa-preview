"use client";
import {useMemo,useState} from "react";
import {BookOpen,ClipboardCheck,MessageSquareText,Pencil,ArrowUpRight,ArrowDownRight,Minus,CalendarDays} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Check,Data,checkProgress,compareChecks,dateLabel,inPeriod,num,readingModes} from "@/lib/analytics";
import "./check-history.css";
import AssessmentAverages from "./assessment-averages";
import {materialLabel} from "@/lib/quran";

function Change({value}:{value:number}){
 const Icon=value>0?ArrowUpRight:value<0?ArrowDownRight:Minus;
 return <span className={`history-change ${value>0?"up":value<0?"down":"same"}`}><Icon size={14} aria-hidden/>{value===0?"Без изменений":`${value>0?"+":""}${num(value)}`}</span>;
}
function HistoryCard({data,check,period,isLast,onEdit}:{data:Data;check:Check;period:string;isLast:boolean;onEdit:(check:Check)=>void}){
 const progress=checkProgress(data,check),[fullNote,setFullNote]=useState(false);
 const reading=check.assessmentType==="reading",note=(check.note??"").trim(),longNote=note.length>240;
 const sameMode=!reading||progress.previous?.readingMode===check.readingMode;
 const totalChange=sameMode?progress.totalChange:null;
 const notePreview=note.slice(0,240).replace(/\s+\S*$/,"");
 return <article className="check-history-card" aria-label={`Проверка от ${dateLabel(check.date)}`}>
  <header className="check-history-card-head"><div><div className="check-history-date"><time dateTime={check.date}>{dateLabel(check.date)}</time>{isLast&&<span>Последняя за период</span>}</div><span className={`check-history-type ${reading?"reading":"general"}`}>{reading?<BookOpen size={14} aria-hidden/>:<ClipboardCheck size={14} aria-hidden/>}{reading?`Чтение · ${readingModes.find(m=>m.value===check.readingMode)?.label??"Способ не указан"}`:"Общая проверка"}</span></div><div className="check-history-total"><span>Итог проверки</span><strong>{num(progress.score)}<small> / 10</small></strong></div></header>
  {progress.previous?<div className="check-history-comparison">{totalChange!==null&&<Change value={totalChange}/>}<span>{!sameMode?"Способ чтения изменился.":progress.totalChange===null?"Состав оценок изменился.":"К предыдущей проверке"} <time dateTime={progress.previous.date}>{dateLabel(progress.previous.date)}</time>{!inPeriod(progress.previous.date,period)&&<small> · вне выбранного периода</small>}</span>{totalChange===null&&<p>Сравнение доступно по отдельным показателям ниже.</p>}</div>:<p className="check-history-first">Первая проверка этого типа · сравнение появится после следующей</p>}
  {check.material&&<p className="history-studied-material"><BookOpen size={15} aria-hidden/>{materialLabel(check.material)}</p>}<div className={`check-history-metrics metrics-${progress.metrics.length}`} aria-label="Оценки по показателям">{progress.metrics.map(metric=><div className={`check-history-metric ${metric.value<data.settings.attention?"below":""}`} key={metric.key}><div><span>{metric.label}</span><b>{num(metric.value)}</b></div><div className="check-history-track" aria-hidden="true"><i style={{width:`${Math.max(0,Math.min(100,metric.value*10))}%`}}/></div>{metric.before!==null?<small className="check-history-before">Было {num(metric.before)}<Change value={metric.change!}/></small>:progress.previous?<small className="check-history-unassessed">Ранее не оценивался</small>:null}{metric.value<data.settings.attention&&<small className="check-history-threshold">Ниже ориентира {num(data.settings.attention)}</small>}</div>)}</div>
  {note&&<div className="check-history-note"><div><MessageSquareText size={15} aria-hidden/><b>Комментарий</b></div><p>{longNote&&!fullNote?`${notePreview}…`:note}</p>{longNote&&<button type="button" aria-expanded={fullNote} onClick={()=>setFullNote(v=>!v)}>{fullNote?"Свернуть комментарий":"Читать полностью"}</button>}</div>}
  <footer><Button type="button" variant="ghost" onClick={()=>onEdit(check)} aria-label={`Изменить проверку от ${dateLabel(check.date)}`}><Pencil size={14} aria-hidden/>Изменить проверку</Button></footer>
 </article>;
}

export default function CheckHistory({data,checks,period,onEdit}:{data:Data;checks:Check[];period:string;onEdit:(check:Check)=>void}){
 const [kind,setKind]=useState("all"),[limit,setLimit]=useState(6);
 const sorted=useMemo(()=>[...checks].sort(compareChecks),[checks]);
 const filtered=sorted.filter(c=>kind==="all"||(kind==="reading"?c.assessmentType==="reading":c.assessmentType!=="reading"));
 const shown=filtered.slice(0,limit),months=new Map<string,Check[]>();
 for(const check of shown){const key=check.date.slice(0,7);months.set(key,[...(months.get(key)??[]),check])}
 return <section className="check-history" aria-label="История проверок за период">
  <div className="check-history-heading"><h3>История проверок за период</h3><span aria-label={`Всего проверок: ${sorted.length}`}>{sorted.length}</span></div>
  {!!sorted.length&&<><p className="check-history-intro">По датам фактических уроков. Новые записи сверху. Итог — для отдельной проверки.</p><div className="check-history-filters" role="group" aria-label="Вид проверок в истории">{[{value:"all",label:"Все",count:sorted.length},{value:"reading",label:"Чтение",count:sorted.filter(c=>c.assessmentType==="reading").length},{value:"general",label:"Общие",count:sorted.filter(c=>c.assessmentType!=="reading").length}].map(item=><button type="button" key={item.value} aria-pressed={kind===item.value} onClick={()=>{setKind(item.value);setLimit(6)}}>{item.label}<span>{item.count}</span></button>)}</div></>}
  <AssessmentAverages checks={filtered} data={data}/>
  {!filtered.length?<div className="check-history-empty"><ClipboardCheck size={27} aria-hidden/><h4>{sorted.length?"Таких проверок за период нет":"За этот период проверок нет"}</h4><p>{sorted.length?"Выберите другой вид проверок.":"Измените период в карточке или добавьте новую проверку."}</p>{sorted.length>0&&<Button type="button" variant="outline" onClick={()=>{setKind("all");setLimit(6)}}>Показать все виды</Button>}</div>:<div className="check-history-months">{[...months].map(([month,items])=><section className="check-history-month" key={month} aria-label={new Date(month+"-15T12:00:00").toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}><h4><CalendarDays size={14} aria-hidden/>{new Date(month+"-15T12:00:00").toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</h4><ol>{items.map(check=><li key={check.id}><HistoryCard data={data} check={check} period={period} isLast={check.id===sorted[0]?.id} onEdit={onEdit}/></li>)}</ol></section>)}</div>}
  {filtered.length>0&&<div className="check-history-more"><span role="status">Показано {shown.length} из {filtered.length}</span>{shown.length<filtered.length&&<Button type="button" variant="outline" onClick={()=>setLimit(n=>n+6)}>Показать ещё {Math.min(6,filtered.length-shown.length)}</Button>}</div>}
 </section>;
}
