"use client";
import {useId,useState} from "react";
import {Check,ChevronDown,Clock3,Plus,Search,Trash2,Users,X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Data,Group,GroupScheduleDraft,TeacherGroupDraft} from "@/lib/analytics";
import {availableGroups,scheduleLabel,weekdays} from "@/lib/groups";
import {teacherGroupDraftSchema,groupSchedulesSchema} from "@/lib/record-schemas";
import "./teacher-group-picker.css";

type Props={data:Data;branch:string;teacherId:string;teacherGender:Group["gender"];value:string[];onChange:(ids:string[])=>void;drafts:TeacherGroupDraft[];onDraftsChange:(groups:TeacherGroupDraft[])=>void;schedules:GroupScheduleDraft[];onSchedulesChange:(groups:GroupScheduleDraft[])=>void;disabled?:boolean};
export default function TeacherGroupPicker({data,branch,teacherId,teacherGender,value,onChange,drafts,onDraftsChange,schedules,onSchedulesChange,disabled}:Props){
 const uid=useId(),[search,setSearch]=useState(""),[showSearch,setShowSearch]=useState(false),[editingId,setEditingId]=useState<string|null>(null),[error,setError]=useState("");
 const groups=availableGroups(data).filter(g=>g.branch===branch),selected=groups.filter(g=>value.includes(g.id));
 const shown=groups.filter(g=>!value.includes(g.id)&&`${g.name} ${data.people.find(t=>t.id===g.teacherId)?.name??""}`.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));
 const draft=drafts.find(g=>g.id===editingId),existing=selected.find(g=>g.id===editingId),schedule=schedules.find(g=>g.id===editingId),editing=draft??(existing?{...existing,...schedule}:undefined);
 function finish(){
  if(!editing){setEditingId(null);return true}
  const checked=draft?teacherGroupDraftSchema.safeParse(editing):groupSchedulesSchema.safeParse([editing]);
  if(!checked.success){setError(checked.error.issues[0].message);return false}
  const all=[...selected,...drafts];
  if(all.some(g=>g.id!==editing.id&&g.name.trim()===editing.name.trim()&&g.gender===editing.gender)){setError("Группа с таким названием для выбранного пола уже добавлена.");return false}
  setError("");setEditingId(null);return true;
 }
 function add(){if(!finish())return;const id=crypto.randomUUID();onDraftsChange([...drafts,{id,name:"",gender:teacherGender,days:[],startTime:"",endTime:""}]);setShowSearch(false);setEditingId(id)}
 function open(g:Group|TeacherGroupDraft){if(g.id===editingId)return;if(!finish())return;setEditingId(g.id);setShowSearch(false);if(!drafts.some(d=>d.id===g.id)&&!schedules.some(s=>s.id===g.id))onSchedulesChange([...schedules,{id:g.id,days:[...g.days],startTime:g.startTime,endTime:g.endTime}])}
 function update(patch:Partial<TeacherGroupDraft>){if(!editing)return;setError("");if(draft)onDraftsChange(drafts.map(g=>g.id===editing.id?{...g,...patch}:g));else{const next={...editing,...patch};onSchedulesChange([...schedules.filter(g=>g.id!==next.id),{id:next.id,days:next.days,startTime:next.startTime,endTime:next.endTime}])}}
 function remove(id:string){onDraftsChange(drafts.filter(g=>g.id!==id));onChange(value.filter(g=>g!==id));onSchedulesChange(schedules.filter(g=>g.id!==id));if(editingId===id){setEditingId(null);setError("")}}
 const count=selected.length+drafts.length;
 return <fieldset className="teacher-groups-compact full" disabled={disabled}><legend>Группы и расписание <span>{count}</span></legend>
 {(count>0)&&<div className="teacher-groups-summary">{[...selected,...drafts].map(g=>{const isDraft=drafts.some(d=>d.id===g.id),current={...g,...schedules.find(s=>s.id===g.id)} as Group;return <div key={g.id} className={`teacher-group-summary ${editingId===g.id?"editing":""}`}><span className={`teacher-group-symbol ${g.gender}`}><Users size={16} aria-hidden/></span><button type="button" className="teacher-group-open" aria-expanded={editingId===g.id} onClick={()=>open(g)}><span><b>{g.name.trim()||"Новая группа"}</b><small>{g.gender==="female"?"Девочки":"Мальчики"}{isDraft&&" · новая"}</small></span><span className="teacher-group-schedule"><Clock3 size={13} aria-hidden/>{scheduleLabel(current)}</span><ChevronDown size={15} aria-hidden/></button>{(isDraft||("teacherId"in g&&g.teacherId!==teacherId))&&<button type="button" className="teacher-group-remove" aria-label={`Убрать группу ${g.name||"новая"}`} onClick={()=>remove(g.id)}><X size={16}/></button>}</div>})}</div>}
 {editing&&<section className="teacher-group-inline" aria-label={draft?"Новая группа учителя":"Расписание выбранной группы"}><div className="teacher-group-inline-title"><b>{draft?"Новая группа":"Расписание группы"}</b>{draft?<button type="button" aria-label="Удалить новую группу" onClick={()=>remove(editing.id)}><Trash2 size={15}/></button>:<button type="button" aria-label="Отменить изменение расписания" onClick={()=>{onSchedulesChange(schedules.filter(g=>g.id!==editing.id));setEditingId(null);setError("")}}><X size={16}/></button>}</div>
 {draft&&<div className="teacher-group-basics"><div><label htmlFor={`${uid}-name`}>Название группы</label><Input autoFocus id={`${uid}-name`} required maxLength={80} placeholder="Например, Утренняя" value={editing.name} onChange={e=>update({name:e.target.value})}/></div><fieldset className="teacher-group-gender"><legend>Для кого</legend><div>{([{value:"male",label:"Мальчики"},{value:"female",label:"Девочки"}] as const).map(g=><label key={g.value} className={editing.gender===g.value?"active":""}><input type="radio" name={`${uid}-gender`} value={g.value} checked={editing.gender===g.value} onChange={()=>update({gender:g.value})}/>{g.label}</label>)}</div></fieldset></div>}
 <fieldset className="teacher-group-week"><legend>Дни недели <span>Можно выбрать несколько</span></legend><div>{weekdays.map((day,index)=><button key={day} type="button" aria-pressed={editing.days.includes(index)} onClick={()=>update({days:editing.days.includes(index)?editing.days.filter(d=>d!==index):[...editing.days,index].sort((a,b)=>a-b)})}>{day}</button>)}</div></fieldset>
 <div className="teacher-group-times"><div><label htmlFor={`${uid}-start`}>Начало · МСК</label><Input id={`${uid}-start`} type="time" required value={editing.startTime} onChange={e=>update({startTime:e.target.value})}/></div><span aria-hidden>—</span><div><label htmlFor={`${uid}-end`}>Окончание</label><Input id={`${uid}-end`} type="time" required min={editing.startTime||undefined} value={editing.endTime} onChange={e=>update({endTime:e.target.value})}/></div><Button type="button" variant="outline" onClick={finish}><Check size={15}/> Готово</Button></div>
 {error&&<p className="teacher-group-error" role="alert">{error}</p>}</section>}
 <div className="teacher-group-actions"><Button type="button" variant="outline" onClick={add} disabled={drafts.length>=20}><Plus size={16}/> Добавить группу</Button><Button type="button" variant="ghost" aria-expanded={showSearch} onClick={()=>{if(finish())setShowSearch(!showSearch)}}><Search size={15}/> Выбрать готовую</Button></div>
 {showSearch&&<div className="teacher-group-search"><label className="sr-only" htmlFor={`${uid}-search`}>Поиск готовой группы</label><Input autoFocus id={`${uid}-search`} placeholder="Название группы или имя учителя" value={search} onChange={e=>setSearch(e.target.value)}/><div className="teacher-group-suggestions">{shown.map(g=><button type="button" key={g.id} onClick={()=>{onChange([...value,g.id]);setSearch("");setShowSearch(false)}}><span><b>{g.name} · {g.gender==="female"?"Девочки":"Мальчики"}</b><small>{data.people.find(t=>t.id===g.teacherId)?.name} · {scheduleLabel(g)}</small></span><Plus size={15}/></button>)}{!shown.length&&<p>{groups.length?"Подходящих групп нет.":"Готовых групп пока нет. Нажмите «Добавить группу»."}</p>}</div><p className="teacher-group-note">Выбранная группа перейдёт к этому учителю вместе с учениками.</p></div>}
 <p className="teacher-group-note">{count?"Учитель и группы сохранятся вместе кнопкой «Сохранить».":"Добавьте группу сейчас или позже. Ученики добавляются в разделе «Группы и занятия»."}</p>
 </fieldset>;
}
