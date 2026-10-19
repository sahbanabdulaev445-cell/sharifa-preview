import {Data,Group,Person,checkCriteria,dateLabel,num,weighted,studentsOf} from "./analytics";
import {groupStudents,groupTeachers,scheduleLabel} from "./groups";
import {personLessonSummary,periodLabel} from "./lesson-assessments";
import {materialLabel} from "./quran";
export type ReportPresentation={facts:string[];metrics:{label:string;value:number|null}[];totals:string[];entries:{title:string;lines:string[]}[];threshold:number;section:string};
export type ShareReport={title:string;subtitle:string;lines:string[];filename:string;presentation?:ReportPresentation};
export function studentReport(data:Data,person:Person,period:string):ShareReport{
 const s=personLessonSummary(data,person,period);
 const teachers=person.kind==="student"?data.people.filter(p=>p.kind==="teacher"&&!p.archived&&studentsOf(data,p.id).some(s=>s.id===person.id)):[];
 const lines=[`Филиал: ${person.branch}`,`Группа: ${person.groups||"не назначена"}`,...(person.kind==="student"?[`Учитель: ${teachers.map(p=>p.name).join(", ")||"не назначен"}`]:[]),`Период: ${periodLabel(period)}`,`Записей: ${s.checks.length} · дней занятий с оценками: ${s.average.days}`,"", "СРЕДНИЕ ОЦЕНКИ",...s.average.metrics.map(k=>`${k.label}: ${num(k.value)}${k.value!==null?` / 10 (${k.count} оценок)`:" — нет оценок"}`),...(s.average.beginner!==null?[`Средний итог начального уровня: ${num(s.average.beginner)} / 10`]:[]),...(s.average.reading!==null?[`Средний итог чтения: ${num(s.average.reading)} / 10`]:[]),...(s.average.general!==null?[`Средний итог общих проверок: ${num(s.average.general)} / 10`]:[]),"", "ИСТОРИЯ УРОКОВ"];
 for(const c of s.checks)lines.push(`${dateLabel(c.date)} · ${c.assessmentType==="beginner"?"Начальный уровень":c.assessmentType==="reading"?"Чтение":"Общая проверка"} · ${num(weighted(c,data.settings.weights))} / 10`,checkCriteria(c).map(k=>`${k.label}: ${num(c[k.key])}`).join(" · "),...(c.material?[materialLabel(c.material)]:[]),...(c.note?.trim()?[`Комментарий: ${c.note.trim()}`]:[]),"");
 if(!s.checks.length)lines.push("За выбранный период оценок нет.");
 return {title:person.name,subtitle:`Карточка ${person.kind==="teacher"?"учителя":"ученика"} · Sharifa`,lines,filename:`Sharifa-${person.id}`,presentation:{facts:lines.slice(0,lines.indexOf("СРЕДНИЕ ОЦЕНКИ")).filter(Boolean),metrics:s.average.metrics.map(m=>({label:m.label,value:m.value})),totals:lines.filter(l=>l.startsWith("Средний итог")),entries:s.checks.map(c=>({title:`${dateLabel(c.date)} · ${c.assessmentType==="beginner"?"Начальный уровень":c.assessmentType==="reading"?"Чтение":"Общая проверка"} · ${num(weighted(c,data.settings.weights))} / 10`,lines:[checkCriteria(c).map(k=>`${k.label}: ${num(c[k.key])}`).join(" · "),...(c.material?[materialLabel(c.material)]:[]),...(c.note?.trim()?[`Комментарий: ${c.note.trim()}`]:[])]})),threshold:data.settings.attention,section:"ИСТОРИЯ УРОКОВ"}};
}
export function groupReport(data:Data,group:Group,period:string):ShareReport{
 const roster=groupStudents(data,group);
 const lines=[`Филиал: ${group.branch}`,`Учителя: ${groupTeachers(data,group).map(t=>t.name).join(", ")||"не назначены"}`,`Расписание: ${scheduleLabel(group)} · МСК`,`Уровень: ${group.level||"не указан"}`,`Период: ${periodLabel(period)}`,`Учеников: ${roster.length}`,"", "СРЕДНИЕ ОЦЕНКИ УЧЕНИКОВ"];
 for(const [i,p] of roster.entries()){
  const s=personLessonSummary(data,p,period);
  lines.push(`${i+1}. ${p.name}`,s.average.metrics.map(k=>`${k.label}: ${num(k.value)}`).join(" · "),`${s.checks.length} записей${s.latest?` · последний урок: ${dateLabel(s.latest.date)}`:" · за период оценок нет"}`,"");
 }
 lines.push("Средние рассчитаны по всем записям за период. Пропущенные оценки не считаются нулём.");
 return {title:`Группа «${group.name}»`,subtitle:"Сводка группы · Sharifa",lines,filename:`Sharifa-group-${group.id}`,presentation:{facts:lines.slice(0,lines.indexOf("СРЕДНИЕ ОЦЕНКИ УЧЕНИКОВ")).filter(Boolean),metrics:[],totals:[],entries:roster.map((p,i)=>{const s=personLessonSummary(data,p,period);return {title:`${i+1}. ${p.name}`,lines:[s.average.metrics.map(k=>`${k.label}: ${num(k.value)}`).join(" · "),`${s.checks.length} записей${s.latest?` · последний урок: ${dateLabel(s.latest.date)}`:" · за период оценок нет"}`]}}),threshold:data.settings.attention,section:"СРЕДНИЕ ОЦЕНКИ УЧЕНИКОВ"}};
}
export const reportText=(r:ShareReport)=>[r.title,r.subtitle,"",...r.lines].join("\n");
