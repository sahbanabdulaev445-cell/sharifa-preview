"use client";
import {useId,useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Data,periodBounds,today} from "@/lib/analytics";
import {Picker} from "./analytics";

export default function PeriodPicker({value,onChange,data,label="Период",allLabel="За всё время"}:{value:string;onChange:(value:string)=>void;data:Data;label?:string;allLabel?:string}){
 const id=useId(),current=today(),year=current.slice(0,4);
 const months=Array.from(new Set([current.slice(0,7),...data.checks.map(c=>c.date.slice(0,7)),...data.exams.map(e=>e.date.slice(0,7)),...(/^\d{4}-\d{2}$/.test(value)?[value]:[])])).sort().reverse();
 const years=Array.from(new Set([year,String(Number(year)-1),...months.map(m=>m.slice(0,4)),...(/^\d{4}$/.test(value)?[value]:[])])).sort().reverse();
 const [editing,setEditing]=useState(false),[start,setStart]=useState(""),[end,setEnd]=useState("");
 const custom=value.startsWith("range:"),bounds=periodBounds(value);
 const from=editing?start:bounds?.start??"",to=editing?end:bounds?.end??"";
 const valid=!!from&&!!to&&from<=to;
 return <div className="period-control"><Picker label={label} value={editing||custom?"custom":value} onChange={v=>{if(v==="custom"){setStart(bounds?.start??`${year}-01-01`);setEnd(bounds?.end??current);setEditing(true)}else{setEditing(false);onChange(v)}}} items={[{value:"all",label:allLabel},...years.map(y=>({value:y,label:`${y} год`})),{value:"custom",label:"Свой период"},...months.map(m=>({value:m,label:new Date(m+"-15").toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}))]}/>{(editing||custom)&&<div className="period-range"><div className="period-date"><label htmlFor={`${id}-from`}>С</label><Input id={`${id}-from`} aria-label={`${label}: с`} type="date" value={from} max={to||undefined} required onChange={e=>{setStart(e.target.value);setEnd(to);setEditing(true)}}/></div><div className="period-date"><label htmlFor={`${id}-to`}>По</label><Input id={`${id}-to`} aria-label={`${label}: по`} type="date" value={to} min={from||undefined} required onChange={e=>{setStart(from);setEnd(e.target.value);setEditing(true)}}/></div><Button variant="outline" disabled={!valid||!editing} onClick={()=>{onChange(`range:${from}:${to}`);setEditing(false)}}>Применить</Button>{!valid&&<p role="alert" className="period-error">Укажите обе даты. Дата «По» должна быть не раньше даты «С».</p>}</div>}</div>;
}
