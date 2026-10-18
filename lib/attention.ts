import {Data,Person,AttentionSignal,attentionSignals,latest,weighted,compareChecks,studentsOf} from "./analytics";

export type AttentionEntry={person:Person;check:NonNullable<ReturnType<typeof latest>>;score:number|null;signals:AttentionSignal[];low:boolean;decline:boolean;lowest:number;drop:number;teachers:Person[]};
export type AttentionFilters={query:string;kind:string;teacherId:string;reason:string;sort:string};
export function attentionEntries(data:Data,people:Person[],period:string):AttentionEntry[]{
 const teachers=data.people.filter(p=>p.kind==="teacher"&&!p.archived),pupils=new Map(teachers.map(t=>[t.id,new Set(studentsOf(data,t.id).map(p=>p.id))]));
 return people.filter(p=>!p.archived).flatMap(person=>{
  const check=latest(data,person.id,period);if(!check)return [];
  const signals=attentionSignals(data,person,period);if(!signals.length)return [];
  return [{person,check,signals,score:weighted(check,data.settings.weights),low:signals.some(s=>s.type==="low"),decline:signals.some(s=>s.type==="decline"),lowest:Math.min(...signals.map(s=>s.value)),drop:Math.max(0,...signals.map(s=>s.change??0)),teachers:person.kind==="student"?teachers.filter(t=>pupils.get(t.id)!.has(person.id)):[]}];
 });
}
const normalize=(s:string)=>s.toLocaleLowerCase("ru").replaceAll("ё","е").trim();
export function filterAttention(entries:AttentionEntry[],filters:AttentionFilters){
 const words=normalize(filters.query).split(/\s+/).filter(Boolean);
 return entries.filter(e=>(filters.kind==="all"||e.person.kind===filters.kind)&&(filters.teacherId==="all"||(e.person.kind==="teacher"?e.person.id===filters.teacherId:filters.teacherId==="__none__"?!e.teachers.length:e.teachers.some(t=>t.id===filters.teacherId)))&&(filters.reason==="all"||(filters.reason==="low"?e.low:e.decline))&&words.every(w=>normalize([e.person.name,e.person.groups,e.person.branch,...e.teachers.map(t=>t.name)].join(" ")).includes(w))).sort((a,b)=>
  (filters.sort==="recent"?compareChecks(a.check,b.check):filters.sort==="decline"?b.drop-a.drop||a.lowest-b.lowest:a.lowest-b.lowest||b.drop-a.drop)||a.person.name.localeCompare(b.person.name,"ru"));
}
