"use client";
import {useMemo,useState} from "react";
import {Building2,ChevronRight,Download,GraduationCap,Layers3,Search,Trophy,Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Tabs,TabsList,TabsTrigger} from "@/components/ui/tabs";
import {Data,Person,num} from "@/lib/analytics";
import {branchRankings,groupRankings} from "@/lib/rankings";
import {Picker} from "./analytics";
import "./group-ratings.css";

type Props={data:Data;branch:string;period:string;onBranchChange:(branch:string)=>void;onDetail:(person:Person)=>void;onExport:(rows:(string|number|null|undefined)[][],name:string)=>void};
function RatingBar({score,label}:{score:number|null;label:string}){
 return <div className={`rating-bar ${score===null?"unrated":""}`} {...(score!==null?{role:"meter","aria-label":label,"aria-valuemin":0,"aria-valuemax":10,"aria-valuenow":score}:{"aria-label":`${label}: нет оценок`})}><span style={{width:`${score===null?0:Math.max(0,Math.min(100,score*10))}%`}}/></div>;
}
function Rank({rank}:{rank:number|null}){return <span className={`rating-place place-${rank??"none"}`} aria-label={rank===null?"Без места: нет оценок":`Место ${rank}`}>{rank===1&&<Trophy size={14} aria-hidden/>}{rank??"—"}</span>}
function Score({value}:{value:number|null}){return <span className="rating-value">{value===null?<small>Нет оценок</small>:<><b>{num(value)}</b><small>из 10</small></>}</span>}

export default function GroupRatings({data,branch,period,onBranchChange,onDetail,onExport}:Props){
 const [view,setView]=useState("groups"),[teacherGender,setTeacherGender]=useState("all"),[teacherId,setTeacherId]=useState("all"),[search,setSearch]=useState("");
 const teachers=data.people.filter(p=>p.kind==="teacher"&&!p.archived&&(branch==="all"||p.branch===branch)&&(teacherGender==="all"||p.gender===teacherGender)).sort((a,b)=>a.name.localeCompare(b.name,"ru"));
 const selectedTeacher=teachers.some(t=>t.id===teacherId)?teacherId:"all";
 const filters=useMemo(()=>({branch,teacherGender,teacherId:selectedTeacher,search}),[branch,teacherGender,selectedTeacher,search]);
 const groups=useMemo(()=>groupRankings(data,period,filters),[data,period,filters]);
 const branches=useMemo(()=>branchRankings(data,period,filters),[data,period,filters]);
 const rows=view==="groups"?groups:branches;
 function exportRatings(){
  if(view==="groups")onExport([["Место","Филиал","Группа","Учителя","Ученики","С оценкой","Результат"],...groups.map(row=>[row.rank,row.group.branch,row.group.name,row.teachers.map(t=>t.name).join(", "),row.students.length,row.assessed,num(row.score)])],"Рейтинг-групп");
  else onExport([["Место","Филиал","Группы","Учителя","Ученики","С оценкой","Результат"],...branches.map(row=>[row.rank,row.name,row.groups,row.teachers.map(t=>t.name).join(", "),row.students.length,row.assessed,num(row.score)])],"Рейтинг-филиалов");
 }
 return <div className="group-ratings">
  <Tabs value={view} onValueChange={value=>{setView(value);setSearch("")}} className="ratings-tabs"><TabsList aria-label="Вид рейтинга"><TabsTrigger value="groups"><Layers3 size={17}/> По группам</TabsTrigger><TabsTrigger value="branches"><Building2 size={17}/> По филиалам</TabsTrigger></TabsList></Tabs>
  <div className="ratings-filters">
   <div className="ratings-field ratings-search"><label htmlFor="ratings-search">{view==="groups"?"Поиск группы":"Поиск филиала"}</label><div className="search-box"><Search aria-hidden/><Input id="ratings-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={view==="groups"?"Группа, филиал или имя учителя":"Название филиала"}/></div></div>
   <div className="ratings-field"><span id="ratings-teacher-gender">Пол учителя</span><Picker label="Пол учителя в рейтинге" value={teacherGender} onChange={value=>{setTeacherGender(value);setTeacherId("all")}} items={[{value:"all",label:"Мужчины и женщины"},{value:"female",label:"Женщины"},{value:"male",label:"Мужчины"}]}/></div>
   <div className="ratings-field"><span>Учитель</span><Picker label="Учитель в рейтинге групп" value={selectedTeacher} onChange={setTeacherId} items={[{value:"all",label:"Все учителя"},...teachers.map(t=>({value:t.id,label:t.name}))]}/></div>
   <Button variant="outline" onClick={exportRatings} disabled={!rows.length}><Download size={16}/> Скачать CSV</Button>
  </div>
  <section className="ratings-panel" aria-label={view==="groups"?"Рейтинг групп":"Рейтинг филиалов"}>
   <header className="ratings-heading"><div><h2>{view==="groups"?"Рейтинг групп":"Рейтинг филиалов"}</h2><p>{branch==="all"?"Все филиалы":branch} · от высокого результата к низкому</p></div><span className="ratings-count">{rows.length} {view==="groups"?"групп":"филиалов"}</span></header>
   {view==="groups"?<ol className="rating-list">{groups.map(row=><li className={`rating-row ${row.rank===1?"is-leader":""}`} key={row.group.id}>
    <Rank rank={row.rank}/><div className="rating-main"><div className="rating-title"><h3>{row.group.name}</h3><span className={`group-gender ${row.group.gender}`}>{row.group.gender==="female"?"Девочки":"Мальчики"}</span>{row.group.level&&<span className="group-level-badge">{row.group.level}</span>}</div>
    <div className="rating-meta"><span><Building2 size={15} aria-hidden/>{row.group.branch}</span><span><Users size={15} aria-hidden/>{row.students.length} учеников · с оценкой {row.assessed}</span></div>
    <div className="rating-teachers"><GraduationCap size={16} aria-hidden/><span>Учителя:</span>{row.teachers.map(t=><button key={t.id} type="button" onClick={()=>onDetail(t)}>{t.name}</button>)}</div>
    <RatingBar score={row.score} label={`Результат группы ${row.group.name}`}/></div><Score value={row.score}/>
   </li>)}</ol>:<ol className="rating-list">{branches.map(row=><li className={`rating-row ${row.rank===1?"is-leader":""}`} key={row.name}>
    <Rank rank={row.rank}/><div className="rating-main"><div className="rating-title"><h3>{row.name}</h3></div><div className="rating-meta"><span><Layers3 size={15} aria-hidden/>{row.groups} групп</span><span><GraduationCap size={15} aria-hidden/>{row.teachers.length} учителей</span><span><Users size={15} aria-hidden/>{row.students.length} учеников · с оценкой {row.assessed}</span></div><RatingBar score={row.score} label={`Результат филиала ${row.name}`}/><button type="button" className="rating-drilldown" onClick={()=>{onBranchChange(row.name);setView("groups");setSearch("")}}>Рейтинг групп филиала <ChevronRight size={15} aria-hidden/></button></div><Score value={row.score}/>
   </li>)}</ol>}
   {!rows.length&&<div className="ratings-empty"><Layers3 size={30} aria-hidden/><h3>Нет подходящих {view==="groups"?"групп":"филиалов"}</h3><p>Измените фильтры или добавьте группы в разделе «Группы и занятия».</p></div>}
   <p className="ratings-footnote">Результат — среднее последних оценок учеников за выбранный период. Ученики без оценки не снижают итог. Общая группа учитывается один раз; при равных результатах — одно место.</p>
  </section>
 </div>;
}
