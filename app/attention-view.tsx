"use client";
import {useMemo,useState} from "react";
import {Search,TriangleAlert,TrendingDown,ClipboardCheck,ArrowRight,CalendarDays,CheckCircle2,SlidersHorizontal,X,Info} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Data,Person,num,dateLabel,readingModes,checkCriteria} from "@/lib/analytics";
import {attentionEntries,filterAttention,AttentionFilters} from "@/lib/attention";
import {Avatar,Picker} from "./analytics";
import "./attention-view.css";

type Props={data:Data;people:Person[];period:string;onDetail:(person:Person)=>void;onCheck:(person:Person)=>void};
const initial:AttentionFilters={query:"",kind:"all",teacherId:"all",reason:"all",sort:"lowest"};
export default function AttentionView({data,people,period,onDetail,onCheck}:Props){
 const [filters,setFilters]=useState(initial),[limit,setLimit]=useState(10);
 const set=(key:keyof AttentionFilters,value:string)=>{setFilters(f=>({...f,[key]:value}));setLimit(10)};
 const entries=useMemo(()=>attentionEntries(data,people,period),[data,people,period]);
 const base=filterAttention(entries,{...filters,reason:"all"}),visible=filterAttention(base,filters);
 const teachers=people.filter(p=>p.kind==="teacher"&&!p.archived).sort((a,b)=>a.name.localeCompare(b.name,"ru"));
 const active=filters.query!==""||filters.kind!=="all"||filters.teacherId!=="all"||filters.reason!=="all"||filters.sort!=="lowest";
 const reset=()=>{setFilters(initial);setLimit(10)};
 return <div className="attention-workspace">
  <div className="attention-totals" aria-label="Причины внимания">
   {[{key:"all",label:"Всего в списке",count:base.length,note:"Ученики и учителя с сигналами",Icon:ClipboardCheck},{key:"low",label:"Низкие показатели",count:base.filter(e=>e.low).length,note:`Ниже ${num(data.settings.attention)} балла`,Icon:TriangleAlert},{key:"decline",label:"Есть снижение",count:base.filter(e=>e.decline).length,note:`На ${num(data.settings.decline)} балла и больше`,Icon:TrendingDown}].map(({key,label,count,note,Icon})=><button type="button" key={key} className={`attention-total ${key}`} aria-pressed={filters.reason===key} onClick={()=>set("reason",key)}><span className="attention-total-icon"><Icon size={20} aria-hidden/></span><span><span className="attention-total-label">{label}</span><b>{count}</b><small>{note}</small></span></button>)}
  </div>
  <section className="attention-tools" aria-label="Поиск и фильтры зоны внимания">
   <div className="attention-tools-top"><div className="attention-kind" role="group" aria-label="Кого показать">{[{value:"all",label:"Все"},{value:"student",label:"Ученики"},{value:"teacher",label:"Учителя"}].map(item=><button type="button" key={item.value} aria-pressed={filters.kind===item.value} onClick={()=>set("kind",item.value)}>{item.label}</button>)}</div><details className="attention-rules"><summary><Info size={16} aria-hidden/>Как устроен список</summary><p>Здесь те, у кого показатель или рейтинг ниже {num(data.settings.attention)}, либо показатель снизился минимум на {num(data.settings.decline)}. У ученика сравниваются две последние проверки одного типа, у учителя — с проверкой за предыдущий месяц. Один человек может попасть в обе категории. Филиал и период выбираются выше.</p></details></div>
   <div className="attention-filter-grid"><div className="attention-search"><label htmlFor="attention-search">Поиск</label><div><Search size={18} aria-hidden/><Input id="attention-search" value={filters.query} onChange={e=>set("query",e.target.value)} placeholder="Имя, группа или учитель"/>{filters.query&&<button type="button" aria-label="Очистить поиск" onClick={()=>set("query","")}><X size={16}/></button>}</div></div><div className="attention-filter"><span>Учитель</span><Picker label="Учитель в зоне внимания" value={filters.teacherId} onChange={v=>set("teacherId",v)} items={[{value:"all",label:"Все учителя"},{value:"__none__",label:"Ученики без учителя"},...teachers.map(t=>({value:t.id,label:t.name}))]}/></div><div className="attention-filter"><span>Порядок</span><Picker label="Порядок сигналов" value={filters.sort} onChange={v=>set("sort",v)} items={[{value:"lowest",label:"Низкие оценки"},{value:"decline",label:"Сильное снижение"},{value:"recent",label:"Новые проверки"}]}/></div></div>
  </section>
  <div className="attention-list-heading"><div><h2>Кому нужна поддержка</h2><p role="status">{visible.length?`Найдено: ${visible.length} · показано ${Math.min(limit,visible.length)}`:"По текущим условиям сигналов нет"}</p></div>{active&&<Button type="button" variant="ghost" onClick={reset}><SlidersHorizontal size={15} aria-hidden/>Сбросить фильтры</Button>}</div>
  {!visible.length?<section className="attention-empty"><span><CheckCircle2 size={30} aria-hidden/></span><h3>{entries.length?"Ничего не найдено":"Сигналов внимания нет"}</h3><p>{entries.length?"Измените имя, учителя или выбранную причину.":"В выбранном филиале и периоде нет проверок с низкими показателями или снижением. Можно выбрать другой период выше."}</p>{active&&<Button type="button" variant="outline" onClick={reset}>Сбросить фильтры</Button>}</section>:<div className="attention-queue">{visible.slice(0,limit).map(entry=>{
   const {person,check,signals}=entry,metrics=[...new Map(signals.map(s=>[s.key,{key:s.key,label:s.label,value:s.value,low:signals.some(v=>v.key===s.key&&v.type==="low"),decline:signals.find(v=>v.key===s.key&&v.type==="decline")}])).values()];
   return <article key={person.id} className="attention-item" aria-label={`Сигналы: ${person.name}`}>
    <div className="attention-item-head"><button type="button" className="attention-person" onClick={()=>onDetail(person)}><Avatar person={person}/><span><strong>{person.name}</strong><small>{person.kind==="student"?"Ученик":"Учитель"} · {person.branch}{person.groups?` · ${person.groups}`:""}</small>{person.kind==="student"&&<small>Учитель: {entry.teachers.map(t=>t.name).join(", ")||"не назначен"}</small>}</span></button><div className="attention-last"><span><CalendarDays size={14} aria-hidden/>{dateLabel(check.date)}</span><b>{num(entry.score)} <small>/ 10</small></b><small>Итог проверки</small></div></div>
    <div className="attention-reasons" aria-label="Что требует внимания">{metrics.map(metric=><div key={metric.key} className={`attention-reason ${metric.low?"is-low":"is-decline"}`}><div><span>{metric.label}</span><b>{num(metric.value)}</b></div>{metric.low&&<p><TriangleAlert size={13} aria-hidden/>Ниже ориентира {num(data.settings.attention)}</p>}{metric.decline&&<p><TrendingDown size={13} aria-hidden/>Было {num(metric.decline.before)} → {num(metric.value)} <strong>−{num(metric.decline.change)}</strong></p>}{metric.decline&&<small>Сравнение с {dateLabel(metric.decline.previousDate)}</small>}</div>)}</div>
    <div className="attention-item-footer"><details className="attention-check-details"><summary>Все оценки проверки</summary><div>{checkCriteria(check).map(metric=><span key={metric.key}>{metric.label}<b>{num(check[metric.key])}</b></span>)}</div>{check.note&&<p>{check.note}</p>}</details><div className="attention-item-actions"><Button variant="outline" type="button" onClick={()=>onDetail(person)}>Карточка и история<ArrowRight size={15} aria-hidden/></Button><Button type="button" onClick={()=>onCheck(person)}><ClipboardCheck size={16} aria-hidden/>Повторная проверка</Button></div></div>
    <p className="attention-check-type">{check.assessmentType==="reading"?`Чтение · ${readingModes.find(m=>m.value===check.readingMode)?.label??""}`:"Общая проверка"}</p>
   </article>;
  })}</div>}
  {visible.length>limit&&<Button type="button" variant="outline" className="attention-more" onClick={()=>setLimit(n=>n+10)}>Показать ещё {Math.min(10,visible.length-limit)}</Button>}
 </div>;
}
