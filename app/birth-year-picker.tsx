"use client";
import {useId,useState} from "react";
import {Plus} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {ageLabel,today} from "@/lib/analytics";
import {birthYearSchema} from "@/lib/record-schemas";
import {birthYearSuggestions,rememberBirthYear} from "@/lib/student-preferences";
import RequiredMark from "./required-mark";

export default function BirthYearPicker({value,onChange,legacyAge}:{value:string;onChange:(value:string)=>void;legacyAge?:number}){
 const id=useId(),[years,setYears]=useState(birthYearSuggestions),[error,setError]=useState("");
 const parsed=birthYearSchema.safeParse(Number(value));
 function add(){if(!parsed.success){setError("Укажите корректный год рождения.");return}if(!rememberBirthYear(parsed.data)){setError("Не удалось сохранить подсказку в браузере.");return}setYears(birthYearSuggestions());setError("")}
 return <div className="form-field full"><label htmlFor={id}>Год рождения<RequiredMark/></label><div className="birth-year-control"><Input id={id} type="number" inputMode="numeric" min={1900} max={Number(today().slice(0,4))} step={1} required list={`${id}-years`} value={value} onChange={e=>{onChange(e.target.value);setError("")}} placeholder="Выберите или введите год"/><datalist id={`${id}-years`}>{years.map(year=><option key={year} value={year}/>)}</datalist><Button type="button" variant="outline" disabled={!parsed.success||years.includes(parsed.data)} onClick={add}><Plus size={15}/> В подсказки</Button></div>{parsed.success&&<p className="field-hint">Возраст по году рождения: <b>{ageLabel({birthYear:parsed.data})}</b></p>}{legacyAge!=null&&value===String(Number(today().slice(0,4))-legacyAge)&&<p className="field-hint">Год рассчитан из прежнего возраста ({legacyAge} лет). При необходимости уточните.</p>}{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}
