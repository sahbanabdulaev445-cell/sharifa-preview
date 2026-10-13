"use client";
import {useState} from "react";
import RequiredMark from "./required-mark";
import {Building2,Plus,Split} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Data,branchNames,alerts,avg,num,result} from "@/lib/analytics";
import {availableGroups} from "@/lib/groups";
type Props={data:Data;branch:string;period:string;onSave:(kind:string,value:unknown)=>Promise<void>;onOpen:(branch:string,page:string)=>void};

export default function BranchesView({data,branch,period,onSave,onOpen}:Props){
 const [editing,setEditing]=useState<string|null|undefined>(undefined);
 return <div className="groups-view"><div className="toolbar group-toolbar"><p className="section-caption">Добавляйте филиалы или переносите часть учителей в отдельный филиал.</p><Button onClick={()=>setEditing(null)}><Plus size={16}/> Добавить филиал</Button></div>
 <div className="branch-grid">{branchNames(data).filter(b=>branch==="all"||b===branch).map(b=>{
  const ps=data.people.filter(p=>p.branch===b&&!p.archived),teachers=ps.filter(p=>p.kind==="teacher"),students=ps.filter(p=>p.kind==="student"),attention=ps.filter(p=>alerts(data,p,period).length),source=data.branches?.find(f=>f.name===b)?.source;
  return <section className="panel branch-card" key={b}><div className="branch-card-header"><Building2 size={23}/><div><h2>{b}</h2><p className="small-muted mt-1">{source?`Выделен из филиала «${source}»`:"Филиал"}</p></div></div><div className="branch-metrics"><div><span>Учителя</span><b>{teachers.length}</b></div><div><span>Ученики</span><b>{students.length}</b></div><div><span>Результат</span><b>{num(avg(students.map(p=>result(data,p,period))))}</b></div></div><div className="flex justify-between mb-5 text-sm"><span className="text-muted-foreground">Зона внимания</span><span className={`status-pill ${attention.length?"warn":""}`}>{attention.length} человек</span></div><div className="branch-actions"><Button variant="outline" onClick={()=>onOpen(b,"teachers")}>Учителя филиала</Button><Button variant="ghost" onClick={()=>onOpen(b,"students")}>Ученики</Button><Button variant="outline" disabled={!teachers.length} onClick={()=>setEditing(b)}><Split size={15}/> Разделить филиал</Button></div></section>;
 })}</div>{editing!==undefined&&<BranchEditor key={editing??"new"} source={editing??undefined} data={data} onSave={onSave} onClose={()=>setEditing(undefined)}/>}</div>;
}

function BranchEditor({source,data,onSave,onClose}:{source?:string;data:Data;onSave:Props["onSave"];onClose:()=>void}){
 const [name,setName]=useState(""),[selected,setSelected]=useState<string[]>([]),[search,setSearch]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const teachers=data.people.filter(p=>p.kind==="teacher"&&!p.archived&&p.branch===source).sort((a,b)=>a.name.localeCompare(b.name,"ru"));
 const groups=availableGroups(data),students=data.people.filter(p=>p.kind==="student"&&!p.archived&&(selected.includes(p.teacherId??"")||!!p.groupId&&groups.some(g=>g.id===p.groupId&&selected.includes(g.teacherId))));
 async function submit(e:React.FormEvent){e.preventDefault();setError("");setBusy(true);try{await onSave("branch",{id:crypto.randomUUID(),name:name.trim(),...(source?{source,teacherIds:selected}:{})});onClose()}catch(err){setError(err instanceof Error?err.message:"Не удалось сохранить филиал")}finally{setBusy(false)}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>{source?"Разделить филиал":"Добавить филиал"}</DialogTitle><DialogDescription>{source?`Выберите учителей филиала «${source}», которые перейдут в новый филиал вместе со своими группами и учениками. Остальные останутся в прежнем филиале.`:"Новый филиал появится во всех списках выбора. Затем можно добавить учителей и группы."}</DialogDescription></DialogHeader><form onSubmit={e=>void submit(e)}><div className="form-field"><label htmlFor="branch-name">Название нового филиала<RequiredMark/></label><Input autoFocus id="branch-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={100} placeholder="Например: Центральный"/></div>
 {source&&<fieldset className="group-members branch-teachers"><legend>Учителя для переноса · выбрано {selected.length}<RequiredMark/></legend><Input aria-label="Найти учителя для переноса" placeholder="Поиск по имени учителя" value={search} onChange={e=>setSearch(e.target.value)}/><div className="group-member-list">{teachers.filter(t=>t.name.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru"))).map(t=><label key={t.id}><input type="checkbox" checked={selected.includes(t.id)} onChange={e=>setSelected(e.target.checked?[...selected,t.id]:selected.filter(id=>id!==t.id))}/><span><b>{t.name}</b><small>{groups.filter(g=>g.teacherId===t.id).length} групп · {data.people.filter(p=>p.kind==="student"&&!p.archived&&p.teacherId===t.id).length} учеников</small></span></label>)}</div><p className="info-box">В новый филиал перейдут: {selected.length} учителей, {groups.filter(g=>selected.includes(g.teacherId)).length} групп и {students.length} учеников. Расписание и история оценок сохранятся.</p></fieldset>}
 {error&&<p className="form-error" role="alert">{error}</p>}<div className="form-footer"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Отмена</Button><Button type="submit" disabled={busy||!!source&&!selected.length}>{busy?"Сохраняем…":source?"Создать филиал и перенести":"Добавить филиал"}</Button></div></form></DialogContent></Dialog>;
}
