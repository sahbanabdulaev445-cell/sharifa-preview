"use client";
import {BookOpen,CalendarDays,CheckCircle2,ChevronDown,ChevronRight,Clock3,GraduationCap,Layers3,MapPin,Network,TriangleAlert,Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Data,Person,Group,avg,num,result,latest,dateLabel,readingModes,studentsOf} from "@/lib/analytics";
import {groupStudents,groupResult,priorityStudents,scheduleLabel,weekdays,teacherHasGroup,teacherGroup} from "@/lib/groups";
import {Avatar} from "./analytics";
import CheckProgress from "./check-progress";

type Props={data:Data;teachers:Person[];groups:Group[];period:string;search:string;expandedId?:string;onSelect:(p:Person)=>void;onDetail:(p:Person)=>void;onGroup:(g:Group,teacher?:Person)=>void;onAssess:(p:Person,g:Group,teacher?:Person)=>void};
const clamp=(value:number)=>Math.max(0,Math.min(10,value));

function ScoreRing({score,small=false}:{score:number|null;small?:boolean}){
 const circumference=2*Math.PI*38;
 return <span className={`lesson-score-ring ${small?"small":""}`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ring-track" cx="50" cy="50" r="38"/><circle className="ring-value" cx="50" cy="50" r="38" strokeDasharray={`${score==null?0:clamp(score)/10*circumference} ${circumference}`} transform="rotate(-90 50 50)"/></svg><span><b>{num(score)}</b><small>из 10</small></span></span>;
}

function ScoreBar({label,value,tone="blue"}:{label:string;value:number|null|undefined;tone?:string}){
 return <span className={`lesson-score-bar ${tone}`}><span><span>{label}</span><b>{num(value)}</b></span><span className="lesson-bar-track"><span style={{width:`${value==null?0:clamp(value)*10}%`}}/></span></span>;
}

export function TeacherLessonList({data,teachers,groups,period,search,expandedId,onSelect,onDetail,onGroup,onAssess}:Props){
 const shown=teachers.filter(t=>`${t.name} ${groups.filter(g=>teacherHasGroup(data,g,t.id)).map(g=>g.name).join(" ")}`.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));
 return <div className="teacher-explorer"><div className="lesson-section-title"><div><h2>Учителя</h2></div><span className="lesson-total">{shown.length} учителей</span></div>
 <div className="teacher-stack">{shown.map((t,index)=>{
  const own=groups.filter(g=>teacherHasGroup(data,g,t.id)).map(g=>teacherGroup(data,g,t.id)),pupils=studentsOf(data,t.id),priority=new Set(own.flatMap(g=>priorityStudents(data,g).map(p=>p.id))),checks=pupils.map(p=>latest(data,p.id,period)).filter(c=>c!==null),open=t.id===expandedId;
  return <article className={`teacher-fold ${open?"is-open":""}`} key={t.id}><h3 className="teacher-fold-heading"><button className="teacher-fold-trigger" type="button" aria-expanded={open} aria-controls={`teacher-lessons-${t.id}`} onClick={()=>onSelect(t)}>
   <span className="teacher-fold-number">{String(index+1).padStart(2,"0")}</span><span className="teacher-identity"><Avatar person={t}/><span><span className="teacher-role">ПРЕПОДАВАТЕЛЬ</span><strong>{t.name}</strong><span className="teacher-location"><MapPin size={14} aria-hidden/>{t.branch}<span>· с {dateLabel(t.startDate)}</span></span></span></span>
   <span className="teacher-quick-metrics"><span><Layers3 size={19} aria-hidden/><b>{own.length}</b><small>групп</small></span><span><GraduationCap size={20} aria-hidden/><b>{pupils.length}</b><small>учеников</small></span><span className={priority.size?"needs-attention":""}><TriangleAlert size={18} aria-hidden/><b>{priority.size}</b><small>нужна поддержка</small></span></span>
   <span className="teacher-rating"><ScoreRing score={result(data,t,period)} small/><span>Рейтинг учителя</span></span><span className="teacher-expand"><ChevronDown size={22} aria-hidden/><span>{open?"Свернуть":"Подробнее"}</span></span>
   <span className="teacher-fold-preview"><span className="teacher-group-preview">{own.slice(0,3).map(g=><span className={g.gender} key={g.id}><span className="lesson-dot"/>{g.name} · {g.gender==="female"?"девочки":"мальчики"}</span>)}{own.length>3&&<span>+{own.length-3} групп</span>}{!own.length&&<span>Группы пока не добавлены</span>}</span><span className="teacher-preview-bars"><ScoreBar label="Махрадж учеников" value={avg(checks.map(c=>c.makhraj))}/><ScoreBar label="Таджвид учеников" value={avg(checks.map(c=>c.tajweed))} tone="teal"/><ScoreBar label="Хифз учеников" value={avg(checks.map(c=>c.hifz??null))}/></span></span>
  </button></h3>
  {open&&<div id={`teacher-lessons-${t.id}`} className="teacher-fold-content"><TeacherLessonDetail data={data} teacher={t} groups={own} period={period} onDetail={onDetail} onGroup={g=>onGroup(g,t)} onAssess={(p,g)=>onAssess(p,g,t)}/></div>}</article>;
 })}</div>{!shown.length&&<section className="panel group-empty"><Users size={32} aria-hidden/><h2>Учителя не найдены</h2><p>Измените поиск или фильтры. Учителей можно добавить в разделе «Учителя».</p></section>}</div>;
}

function TeacherLessonDetail({data,teacher,groups,period,onDetail,onGroup,onAssess}:Omit<Props,"teachers"|"search"|"onSelect"|"expandedId">&{teacher:Person}){
 const pupils=studentsOf(data,teacher.id).sort((a,b)=>a.name.localeCompare(b.name,"ru"));
 const pupilGroup=(p:Person)=>groups.find(g=>p.groupId===g.id||!p.groupId&&p.groups===g.name&&p.gender===g.gender);
 const scheduled=groups.filter(g=>g.days.length),checks=pupils.map(p=>latest(data,p.id,period)).filter(c=>c!==null);
 const assessed=checks.length,low=pupils.filter(p=>{const score=result(data,p,period);return score!==null&&score<data.settings.attention}).length;
 return <>
 <div className="teacher-detail-top"><span><Network size={17} aria-hidden/> Карта обучения</span><Button variant="outline" onClick={()=>onDetail(teacher)}>Проверки и экзамены <ChevronRight size={16}/></Button></div>
 <section className="teaching-map" aria-label="Схема: учитель и его группы"><div className="teaching-map-root"><span className="teaching-root-icon"><Users size={24} aria-hidden/></span><div><small>УЧИТЕЛЬ</small><b>{teacher.name}</b></div><span className="teaching-root-count">{groups.length} групп</span></div><div className="teaching-map-branches">{groups.map(g=>{
  const roster=groupStudents(data,g),attention=priorityStudents(data,g);
  return <button key={g.id} className={`teaching-group-node ${g.gender}`} onClick={()=>onGroup(g)}><span className="teaching-node-heading"><span className="group-gender">{g.gender==="female"?"Девочки":"Мальчики"}</span><ChevronRight size={18} aria-hidden/></span><strong>{g.name}</strong>{g.level&&<span className="group-level-badge">{g.level}</span>}<span className="teaching-node-score"><ScoreRing score={groupResult(data,g,period)} small/><span><b>{roster.length}</b> учеников<small>{attention.length?`${attention.length} нужна поддержка`:"Нет низких последних оценок"}</small></span></span><span className="teaching-node-schedule"><Clock3 size={15} aria-hidden/>{scheduleLabel(g)}</span><span className="teaching-node-action">Открыть группу и оценить чтение <ChevronRight size={15}/></span></button>;
 })}{!groups.length&&<div className="lesson-empty-note"><Layers3 size={24} aria-hidden/><p>У учителя пока нет групп. Выберите готовые группы в его карточке.</p></div>}</div></section>

 <div className="teacher-visual-grid"><section className="lesson-visual-panel"><div className="lesson-block-heading"><BookOpen size={20} aria-hidden/><div><h4>Результаты учеников</h4><p>Последние оценки за выбранный период</p></div></div><div className="lesson-criteria"><ScoreBar label="Махрадж" value={avg(checks.map(c=>c.makhraj))}/><ScoreBar label="Таджвид" value={avg(checks.map(c=>c.tajweed))} tone="teal"/><ScoreBar label="Хифз" value={avg(checks.map(c=>c.hifz??null))}/></div><div className="lesson-distribution" aria-label={`Из ${pupils.length} учеников: ${low} с итогом ниже порога, ${assessed-low} с итогом от порога, ${pupils.length-assessed} без оценки`}>
 <div className="distribution-track">{pupils.length>0?<><span className="low" style={{flex:low}}/><span className="good" style={{flex:assessed-low}}/><span className="unrated" style={{flex:pupils.length-assessed}}/></>:<span className="unrated" style={{flex:1}}/>}</div><div className="distribution-legend"><span><i className="low"/>Ниже {num(data.settings.attention)} <b>{low}</b></span><span><i className="good"/>От {num(data.settings.attention)} <b>{assessed-low}</b></span><span><i className="unrated"/>Без оценки <b>{pupils.length-assessed}</b></span></div></div></section>
</div>

 <section className="lesson-timetable"><div className="lesson-block-heading"><CalendarDays size={20} aria-hidden/><div><h4>Неделя учителя</h4><p>Расписание групп · московское время</p></div></div>{scheduled.length?<div className="lesson-week">{weekdays.map((day,index)=><div className={`lesson-day ${scheduled.some(g=>g.days.includes(index))?"has-lessons":""}`} key={day}><span className="lesson-day-name">{day}</span>{scheduled.filter(g=>g.days.includes(index)).sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(g=><button className={`lesson-slot ${g.gender}`} key={g.id} onClick={()=>onGroup(g)}><b>{g.startTime}</b><span>{g.name}</span><small>до {g.endTime}</small></button>)}{!scheduled.some(g=>g.days.includes(index))&&<span className="lesson-free-day">—</span>}</div>)}</div>:<div className="lesson-empty-note"><Clock3 size={23} aria-hidden/><p>Расписание пока не задано. Откройте группу и выберите дни и время занятий.</p></div>}</section>

 <details className="lesson-pupils"><summary><span><GraduationCap size={21} aria-hidden/><b>Ученики по алфавиту</b><span className="lesson-total">{pupils.length}</span></span><ChevronDown size={20} aria-hidden/></summary><div className="lesson-pupil-list">{pupils.map(p=>{const c=latest(data,p.id,period),g=pupilGroup(p);return <div className="lesson-pupil-row" key={p.id}><button className="lesson-pupil-name" onClick={()=>onDetail(p)}><Avatar person={p}/><span><b>{p.name}</b><small>{p.groups||"Без группы"} · {p.gender==="female"?"Девочка":"Мальчик"}</small><small>{c?.assessmentType==="reading"?readingModes.find(m=>m.value===c.readingMode)?.label:c?"Общая проверка":"Нет оценки за период"}</small></span></button><span className="last-check-date">{c?`Проверка: ${dateLabel(c.date)}`:"Без проверки за период"}</span><span className="lesson-pupil-total">{num(result(data,p,period))}</span>{g&&<Button variant="outline" onClick={()=>onAssess(p,g)}>Оценить <ChevronRight size={15}/></Button>}{c&&<CheckProgress data={data} check={c} compact/>}</div>})}{!pupils.length&&<p className="lesson-empty-note">У этого учителя пока нет учеников.</p>}</div></details>
 </>;
}
