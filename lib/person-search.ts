import {Data,Person,studentsOf,today} from "./analytics";
export function stepBirthYear(value:string,direction:number,max=Number(today().slice(0,4))){if(!value.trim()||!Number.isFinite(Number(value)))return 2018;return Math.max(1900,Math.min(max,Math.trunc(Number(value))+direction))}
export type PersonSearch={kind:Person["kind"];branch:string;teacherId:string;query:string};
const normalize=(value:string)=>value.toLocaleLowerCase("ru").replaceAll("ё","е").trim();
export function searchPeople(data:Data,filters:PersonSearch){
 const pupils=new Set(studentsOf(data,filters.teacherId).map(p=>p.id)),words=normalize(filters.query).split(/\s+/).filter(Boolean);
 return data.people.filter(p=>!p.archived&&p.kind===filters.kind&&(filters.branch==="all"||p.branch===filters.branch)&&(p.kind==="teacher"||filters.teacherId==="all"||pupils.has(p.id))&&words.every(word=>normalize(p.name).includes(word))).sort((a,b)=>a.name.localeCompare(b.name,"ru"));
}
