import {Data,Group,Person,checkCriteria,dateLabel,num,weighted,studentsOf} from "./analytics";
import {groupStudents,groupTeachers,scheduleLabel} from "./groups";
import {personLessonSummary,periodLabel} from "./lesson-assessments";
import {materialLabel} from "./quran";
export type ShareReport={title:string;subtitle:string;lines:string[];filename:string};
export function studentReport(data:Data,person:Person,period:string):ShareReport{
 const s=personLessonSummary(data,person,period);
 const teachers=person.kind==="student"?data.people.filter(p=>p.kind==="teacher"&&!p.archived&&studentsOf(data,p.id).some(s=>s.id===person.id)):[];
 const lines=[`Филиал: ${person.branch}`,`Группа: ${person.groups||"не назначена"}`,...(person.kind==="student"?[`Учитель: ${teachers.map(p=>p.name).join(", ")||"не назначен"}`]:[]),`Период: ${periodLabel(period)}`,`Записей: ${s.checks.length} · дней занятий с оценками: ${s.average.days}`,"", "СРЕДНИЕ ОЦЕНКИ",...s.average.metrics.map(k=>`${k.label}: ${num(k.value)}${k.value!==null?` / 10 (${k.count} оценок)`:" — нет оценок"}`),...(s.average.reading!==null?[`Средний итог чтения: ${num(s.average.reading)} / 10`]:[]),...(s.average.general!==null?[`Средний итог общих проверок: ${num(s.average.general)} / 10`]:[]),"", "ИСТОРИЯ УРОКОВ"];
 for(const c of s.checks)lines.push(`${dateLabel(c.date)} · ${c.assessmentType==="reading"?"Чтение":"Общая проверка"} · ${num(weighted(c,data.settings.weights))} / 10`,checkCriteria(c).map(k=>`${k.label}: ${num(c[k.key])}`).join(" · "),...(c.material?[materialLabel(c.material)]:[]),...(c.note?.trim()?[`Комментарий: ${c.note.trim()}`]:[]),"");
 if(!s.checks.length)lines.push("За выбранный период оценок нет.");
 return {title:person.name,subtitle:`Карточка ${person.kind==="teacher"?"учителя":"ученика"} · Sharifa`,lines,filename:`Sharifa-${person.id}`};
}
export function groupReport(data:Data,group:Group,period:string):ShareReport{
 const roster=groupStudents(data,group);
 const lines=[`Филиал: ${group.branch}`,`Учителя: ${groupTeachers(data,group).map(t=>t.name).join(", ")||"не назначены"}`,`Расписание: ${scheduleLabel(group)} · МСК`,`Уровень: ${group.level||"не указан"}`,`Период: ${periodLabel(period)}`,`Учеников: ${roster.length}`,"", "СРЕДНИЕ ОЦЕНКИ УЧЕНИКОВ"];
 for(const [i,p] of roster.entries()){
  const s=personLessonSummary(data,p,period);
  lines.push(`${i+1}. ${p.name}`,s.average.metrics.map(k=>`${k.label}: ${num(k.value)}`).join(" · "),`${s.checks.length} записей${s.latest?` · последний урок: ${dateLabel(s.latest.date)}`:" · за период оценок нет"}`,"");
 }
 lines.push("Средние рассчитаны по всем записям за период. Пропущенные оценки не считаются нулём.");
 return {title:`Группа «${group.name}»`,subtitle:"Сводка группы · Sharifa",lines,filename:`Sharifa-group-${group.id}`};
}
export const reportText=(r:ShareReport)=>[r.title,r.subtitle,"",...r.lines].join("\n");
