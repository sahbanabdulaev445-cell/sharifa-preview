"use client";
import {useId,useState} from "react";
import {ChevronUp,ChevronDown} from "lucide-react";
import {Input} from "@/components/ui/input";
import {ageLabel,today} from "@/lib/analytics";
import {birthYearSchema} from "@/lib/record-schemas";
import {birthYearSuggestions} from "@/lib/student-preferences";
import {stepBirthYear} from "@/lib/person-search";
import RequiredMark from "./required-mark";
import "./management.css";
export default function BirthYearPicker({value,onChange,legacyAge}:{value:string;onChange:(value:string)=>void;legacyAge?:number}){
 const id=useId(),[years]=useState(birthYearSuggestions),parsed=birthYearSchema.safeParse(Number(value));
 const step=(direction:number)=>onChange(String(stepBirthYear(value,direction)));
 return <div className="form-field full"><label htmlFor={id}>Год рождения<RequiredMark/></label><div className="year-stepper"><Input id={id} type="number" inputMode="numeric" min={1900} max={Number(today().slice(0,4))} step={1} required list={`${id}-years`} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();step(e.key==="ArrowUp"?1:-1)}}} placeholder="2018"/><div className="year-stepper-buttons"><button type="button" aria-label="Увеличить год рождения" onClick={()=>step(1)}><ChevronUp size={17} aria-hidden/></button><button type="button" aria-label="Уменьшить год рождения" onClick={()=>step(-1)}><ChevronDown size={17} aria-hidden/></button></div></div><datalist id={`${id}-years`}>{years.map(year=><option key={year} value={year}/>)}</datalist>{parsed.success&&<p className="field-hint">Возраст по году рождения: <b>{ageLabel({birthYear:parsed.data})}</b></p>}{legacyAge!=null&&value===String(Number(today().slice(0,4))-legacyAge)&&<p className="field-hint">Год рассчитан из прежнего возраста ({legacyAge} лет). При необходимости уточните.</p>}</div>;
}
