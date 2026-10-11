"use client";
import {useId,useState} from "react";
import {Check,Pencil,Plus,X} from "lucide-react";
import {Input} from "@/components/ui/input";
import {LessonTime} from "@/lib/analytics";
import {lessonTimesSchema} from "@/lib/record-schemas";
import "./teacher-group-picker.css";

export default function LessonTimePicker({value,onChange,presets,onPresetsChange}:{value:LessonTime;onChange:(time:LessonTime)=>void;presets:LessonTime[];onPresetsChange:(times:LessonTime[])=>void}){
 const uid=useId(),[editing,setEditing]=useState(false),[error,setError]=useState("");
 const label=(t:LessonTime)=>`${t.startTime}–${t.endTime}`;
 function add(){const checked=lessonTimesSchema.safeParse([...presets,value]);if(!checked.success){setError(checked.error.issues[0].message);return}onPresetsChange(checked.data.sort((a,b)=>a.startTime.localeCompare(b.startTime)));setError("")}
 return <fieldset className="lesson-time-picker"><legend>Время занятия <span>МСК</span></legend><div className="lesson-time-options">{presets.map(t=><button type="button" key={label(t)} aria-pressed={t.startTime===value.startTime&&t.endTime===value.endTime} onClick={()=>{onChange(t);setError("")}}>{label(t)}</button>)}{value.startTime&&value.endTime&&!presets.some(t=>label(t)===label(value))&&<button type="button" aria-pressed="true" onClick={()=>setEditing(true)}>{label(value)}</button>}</div>
 <button type="button" className="lesson-time-pencil" aria-expanded={editing} aria-label="Настроить варианты времени" onClick={()=>{setEditing(!editing);setError("")}}><Pencil size={13} aria-hidden/> Настроить время</button>
 {editing&&<div className="lesson-time-config"><div className="lesson-time-inputs"><div><label htmlFor={`${uid}-start`}>Начало</label><Input id={`${uid}-start`} type="time" value={value.startTime} onChange={e=>{onChange({...value,startTime:e.target.value});setError("")}}/></div><span aria-hidden>—</span><div><label htmlFor={`${uid}-end`}>Окончание</label><Input id={`${uid}-end`} type="time" value={value.endTime} onChange={e=>{onChange({...value,endTime:e.target.value});setError("")}}/></div></div><div className="lesson-time-config-actions"><button type="button" onClick={add}><Plus size={14}/> В подсказки</button><button type="button" onClick={()=>{const checked=lessonTimesSchema.safeParse([value]);if(!checked.success){setError(checked.error.issues[0].message);return}setEditing(false);setError("")}}><Check size={14}/> Готово</button></div>{presets.length>0&&<div className="lesson-time-manage">{presets.map(t=><span key={label(t)}>{label(t)}<button type="button" aria-label={`Убрать подсказку ${label(t)}`} onClick={()=>onPresetsChange(presets.filter(p=>label(p)!==label(t)))}><X size={13}/></button></span>)}</div>}<p className="teacher-group-note">Подсказки сохранятся вместе с формой и будут доступны для других учителей.</p>{error&&<p className="teacher-group-error" role="alert">{error}</p>}</div>}
 </fieldset>;
}
