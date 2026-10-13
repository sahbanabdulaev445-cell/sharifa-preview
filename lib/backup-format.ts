import {z} from "zod";
import {backupRecordSchemas} from "./record-schemas";
import {branches} from "./analytics";

export const MAX_BACKUP_BYTES=10*1024*1024;
export const backupSchema=z.object({
 format:z.literal("sharifa-director-analytics"),
 version:z.union([z.literal(1),z.literal(2),z.literal(3)]),
 exportedAt:z.string().datetime(),
 records:z.array(z.object({id:z.string().min(1).max(110),dataset:z.enum(["demo","work"]),kind:z.enum(["person","group","branch","check","exam","settings","marker"]),value:z.record(z.unknown())}).strict()).max(100000),
}).strict();
export type Backup=z.infer<typeof backupSchema>;

export function validateBackup(input:unknown):Backup {
 const parsed=backupSchema.safeParse(input);
 if(!parsed.success)throw new Error("Файл не является резервной копией «Аналитики руководства» поддерживаемой версии.");
 const backup=parsed.data,ids=new Set<string>();
 const people=new Map<string,Record<string,unknown>>(),groups=new Map<string,Record<string,unknown>>();
 const branchSets={demo:new Set(branches.map(b=>b.toLocaleLowerCase("ru"))),work:new Set(branches.map(b=>b.toLocaleLowerCase("ru")))};
 for(const row of backup.records){
  if(ids.has(row.id))throw new Error("В файле повторяются записи. Выберите исходную резервную копию.");
  ids.add(row.id);
  if(row.kind==="marker"){
   if(row.dataset!=="demo"||row.id!=="demo:initialized"||Object.keys(row.value).length)throw new Error("Повреждена служебная запись учебного примера.");
   continue;
  }
  const checked=backupRecordSchemas[row.kind].safeParse(row.value);
  if(!checked.success||row.id!==`${row.dataset}:${row.value.id}`)throw new Error(`Некорректная запись в файле: ${row.id}.`);
  if(row.kind==="person"){
   if(row.value.kind!=="teacher"&&row.value.groupAssignments!==undefined)throw new Error("Назначения групп доступны только учителям.");
   if(row.value.kind==="student"&&(!row.value.teacherId||!row.value.age||!row.value.level))throw new Error("В карточке ученика отсутствует учитель, возраст или уровень.");
   people.set(row.id,row.value);
  }
  if(row.kind==="group")groups.set(row.id,row.value);
  if(row.kind==="branch"){const name=String(row.value.name).toLocaleLowerCase("ru");if(branchSets[row.dataset].has(name))throw new Error("В файле повторяются названия филиалов.");branchSets[row.dataset].add(name)}
 }
 for(const row of backup.records){
  const branch=row.kind==="branch"?row.value.source:row.kind==="person"||row.kind==="group"?row.value.branch:null;
  if(branch&&!branchSets[row.dataset].has(String(branch).toLocaleLowerCase("ru")))throw new Error("В файле отсутствует связанный филиал.");
  const teacherId=row.kind==="exam"||row.kind==="group"||row.kind==="check"&&row.value.assessmentType==="reading"||row.kind==="person"&&row.value.kind==="student"?row.value.teacherId:null;
  if(teacherId&&people.get(`${row.dataset}:${teacherId}`)?.kind!=="teacher")throw new Error("В файле отсутствует учитель, связанный с учеником или экзаменом.");
  if(row.kind==="check"&&!people.has(`${row.dataset}:${row.value.personId}`))throw new Error("В файле отсутствует человек, к которому относится проверка.");
  if(row.value.groupId&&(row.kind==="person"||row.kind==="check")){
   const group=groups.get(`${row.dataset}:${row.value.groupId}`);
   if(!group)throw new Error("В файле отсутствует группа ученика или проверки.");
   const assignments=people.get(`${row.dataset}:${row.value.teacherId}`)?.groupAssignments;
   const linked=row.value.teacherId===group.teacherId||Array.isArray(assignments)&&assignments.some((a:{groupId:string})=>a.groupId===group.id);
   if(row.kind==="person"&&(row.value.kind!=="student"||row.value.gender!==group.gender||row.value.branch!==group.branch||!linked||row.value.groups!==group.name))throw new Error("Карточка ученика не соответствует его группе.");
  }
  if(row.kind==="person"&&Array.isArray(row.value.groupAssignments))for(const assignment of row.value.groupAssignments){const group=groups.get(`${row.dataset}:${assignment.groupId}`);if(!group||group.branch!==row.value.branch)throw new Error("Назначенная учителю группа отсутствует или относится к другому филиалу.")}
  if(row.kind==="group"&&people.get(`${row.dataset}:${row.value.teacherId}`)?.branch!==row.value.branch)throw new Error("Филиал группы не соответствует филиалу учителя.");
  if(row.kind==="check"&&row.value.assessmentType==="reading"&&people.get(`${row.dataset}:${row.value.personId}`)?.kind!=="student")throw new Error("Проверка чтения должна относиться к ученику.");
 }
 for(const dataset of ["demo","work"]){
  if(!backup.records.some(r=>r.dataset===dataset&&r.kind==="settings"&&r.id===`${dataset}:settings`))throw new Error("В файле отсутствуют настройки одного из наборов данных.");
 }
 if(!backup.records.some(r=>r.kind==="marker"&&r.id==="demo:initialized"))throw new Error("В файле отсутствует служебная запись учебного примера.");
 return backup;
}

export function backupSummary(backup:Backup){return (["work","demo"] as const).map(dataset=>({dataset,label:dataset==="work"?"Рабочие данные":"Учебный пример",teachers:backup.records.filter(r=>r.dataset===dataset&&r.kind==="person"&&r.value.kind==="teacher").length,students:backup.records.filter(r=>r.dataset===dataset&&r.kind==="person"&&r.value.kind==="student").length,groups:backup.records.filter(r=>r.dataset===dataset&&r.kind==="group").length,checks:backup.records.filter(r=>r.dataset===dataset&&r.kind==="check").length,exams:backup.records.filter(r=>r.dataset===dataset&&r.kind==="exam").length}))}
