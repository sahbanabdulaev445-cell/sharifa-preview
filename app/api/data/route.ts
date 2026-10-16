import {readData,saveRecords} from "@/lib/storage";
import {recordSchemas as schemas,groupMembersSchema,groupSchedulesSchema,lessonTimesSchema} from "@/lib/record-schemas";
import {Group,Person,Branch,branchNames,branchEntries} from "@/lib/analytics";
import {availableGroups,groupStudents,teacherHasGroup,teacherGroup,groupTeachers} from "@/lib/groups";
import {planBranchAction,BranchAction} from "@/lib/branches";
import {getChatGPTUser} from "@/app/chatgpt-auth";
export const dynamic="force-dynamic";

function reply(value:unknown,status=200){return Response.json(value,{status,headers:{"Cache-Control":"no-store"}})}
function dataset(req:Request){return new URL(req.url).searchParams.get("dataset")==="work"?"work":"demo"}
export async function GET(req:Request){if(!await getChatGPTUser())return reply({error:"Войдите в сайт, чтобы открыть данные"},401);try{return reply(await readData(dataset(req)))}catch(e){console.error("Read analytics",e);return reply({error:"Не удалось загрузить данные. Нажмите «Повторить»."},503)}}
export async function POST(req:Request){
 if(!await getChatGPTUser())return reply({error:"Сессия завершена. Обновите страницу и войдите снова."},401);
 const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return reply({error:"Недопустимый источник запроса"},403);
 try{
  const raw=await req.text();if(raw.length>100000)return reply({error:"Слишком большой запрос"},413);
  let body;try{body=JSON.parse(raw)}catch{return reply({error:"Некорректный запрос"},400)}
  if(!body||!Object.hasOwn(schemas,body.kind))return reply({error:"Неизвестный тип записи"},400);
  const kind=body.kind as keyof typeof schemas,parsed=schemas[kind].safeParse(body.value);
  if(!parsed.success)return reply({error:parsed.error.issues.map(i=>i.message).join(". ")},400);
  const value=parsed.data,d=await readData(dataset(req)),groups=availableGroups(d);
  if(kind==="branch-action"){let changes;try{changes=planBranchAction(d,value as BranchAction)}catch(error){return reply({error:error instanceof Error?error.message:"Не удалось изменить филиал"},400)}await saveRecords(dataset(req),changes);return reply({ok:true,id:value.id})}
  const existing=[...d.people.map(p=>({kind:"person",id:p.id})),...groups.map(g=>({kind:"group",id:g.id})),...branchEntries(d).map(b=>({kind:"branch",id:b.id})),...d.checks.map(c=>({kind:"check",id:c.id})),...d.exams.map(e=>({kind:"exam",id:e.id})),{kind:"settings",id:"settings"},{kind:"marker",id:"initialized"}].find(r=>r.id===value.id);
  if(existing&&existing.kind!==kind)return reply({error:"Этот идентификатор уже занят другой записью"},400);
  const writes:{kind:string;value:{id:string;[key:string]:unknown}}[]=[];
  if((kind==="person"||kind==="group")&&"branch"in value&&!branchNames(d).includes(value.branch))return reply({error:"Сначала создайте этот филиал в разделе «Филиалы»"},400);
  if(kind==="branch"){
   const b=value as Branch;
   if(b.replaces||b.archived)return reply({error:"Используйте действия редактирования филиала"},400);
   if(existing)return reply({error:"Для изменения структуры создайте новый филиал или разделите существующий"},400);
   if(branchNames(d).some(name=>name.toLocaleLowerCase("ru")===b.name.toLocaleLowerCase("ru")))return reply({error:"Филиал с таким названием уже существует"},400);
   const members=groupMembersSchema.safeParse(body.value.teacherIds??[]);
   if(!members.success)return reply({error:"Некорректный список учителей"},400);
   if(b.source&&!branchNames(d).includes(b.source))return reply({error:"Исходный филиал не найден"},400);
   if((b.source&&!members.data.length)||(!b.source&&members.data.length))return reply({error:"Для разделения выберите исходный филиал и учителей"},400);
   const selected=d.people.filter(p=>members.data.includes(p.id)&&p.kind==="teacher"&&!p.archived&&p.branch===b.source);
   if(selected.length!==members.data.length)return reply({error:"Выберите учителей исходного филиала"},400);
   for(const g of groups){const participants=[...new Set([g.teacherId,...groupTeachers(d,g).map(t=>t.id)])];if(participants.some(id=>members.data.includes(id))&&participants.some(id=>!members.data.includes(id)))return reply({error:`Группа «${g.name}» общая. Для переноса в новый филиал выберите всех её преподавателей.`},400)}
   const movedGroups=new Map([...d.groups,...groups].filter(g=>members.data.includes(g.teacherId)).map(g=>[g.id,g]));
   for(const p of d.people.filter(p=>members.data.includes(p.id)||p.kind==="student"&&(members.data.includes(p.teacherId??"")||!!p.groupId&&movedGroups.has(p.groupId))))writes.push({kind:"person",value:{...p,branch:b.name}});
   for(const g of movedGroups.values())writes.push({kind:"group",value:{...g,branch:b.name}});
  }
  if(kind==="group"){
   const g=value as Group,teacher=d.people.find(p=>p.id===g.teacherId&&p.kind==="teacher"&&!p.archived);
   if(!teacher||teacher.branch!==g.branch)return reply({error:"Выберите учителя в филиале группы"},400);
   if(groups.some(other=>other.id!==g.id&&other.teacherId===g.teacherId&&other.name===g.name&&other.gender===g.gender))return reply({error:"У этого учителя уже есть группа с таким названием и полом"},400);
   const old=groups.find(other=>other.id===g.id),members=groupMembersSchema.safeParse(body.value.studentIds??(old?groupStudents(d,old).map(p=>p.id):[]));
   if(!members.success)return reply({error:"Некорректный список учеников"},400);
   const selected=members.data.map(id=>d.people.find(p=>p.id===id&&p.kind==="student"&&!p.archived));
   if(selected.some(p=>!p||p.gender!==g.gender||p.branch!==g.branch))return reply({error:"В группе могут быть только ученики выбранного пола и филиала"},400);
   const before=old?groupStudents(d,old):[];
   for(const p of before.filter(p=>!members.data.includes(p.id))){const detached={...p,groups:""};delete detached.groupId;writes.push({kind:"person",value:detached})}
   for(const p of selected as Person[])writes.push({kind:"person",value:{...p,groupId:g.id,groups:g.name,teacherId:g.teacherId,branch:g.branch}});
   const nextGroups=[...groups.filter(other=>other.id!==g.id),g];
   for(const teacherId of new Set([g.teacherId,...(old?[old.teacherId]:[])])){
    const t=d.people.find(p=>p.id===teacherId)!;
    writes.push({kind:"person",value:{...t,...(teacherId===g.teacherId&&t.groupAssignments&&!t.groupAssignments.some(a=>a.groupId===g.id)?{groupAssignments:[...t.groupAssignments,{groupId:g.id,days:g.days,startTime:g.startTime,endTime:g.endTime}]}:{}),groups:[...new Set(nextGroups.filter(other=>other.id===g.id&&teacherId===g.teacherId||teacherHasGroup(d,other,teacherId)).map(other=>other.name))].join(", ")}});
   }
  }
  if(kind==="person"&&"kind"in value){
   const p=value as Person,previous=d.people.find(other=>other.id===p.id);
   if(previous&&previous.kind!==p.kind)return reply({error:"Тип существующей карточки нельзя менять"},400);
   if(p.kind==="student"){
    if(p.groupAssignments)return reply({error:"Группы преподавания доступны только учителям"},400);
    if((p.birthYear==null&&p.age==null)||!p.level)return reply({error:"Укажите год рождения и уровень ученика"},400);
    if(p.passport)return reply({error:"Паспортные данные доступны только в карточке учителя"},400);
    const t=d.people.find(other=>other.id===p.teacherId&&other.kind==="teacher"&&!other.archived);
    if(p.teacherId&&(!t||t.branch!==p.branch))return reply({error:"Учитель должен работать в выбранном филиале"},400);
    if(p.groupId){const g=groups.find(g=>g.id===p.groupId);if(!g||(p.teacherId&&!(g.teacherId===p.teacherId||teacherHasGroup(d,g,p.teacherId)))||g.branch!==p.branch||g.gender!==p.gender||g.name!==p.groups)return reply({error:"Выберите группу нужного пола, филиала и учителя"},400);if(!d.groups.some(other=>other.id===g.id))writes.push({kind:"group",value:g})}
    else if(p.groups){if(!t||!t.groups.split(",").map(x=>x.trim()).includes(p.groups))return reply({error:"Группа ученика должна входить в список групп учителя"},400);const explicit=d.groups.find(g=>teacherHasGroup(d,g,p.teacherId!)&&g.name===p.groups&&g.gender===p.gender);if(explicit)p.groupId=explicit.id}
   }else{
    if(!p.startDate)return reply({error:"Укажите дату начала работы учителя"},400);
    if(body.value.newGroups?.length)return reply({error:"Создайте группу отдельно в разделе «Группы и занятия»"},400);
    if(body.value.groupIds!==undefined||body.value.groupSchedules!==undefined||p.groupAssignments!==undefined){
     const ids=groupMembersSchema.safeParse(body.value.groupIds??p.groupAssignments?.map(a=>a.groupId)??groups.filter(g=>teacherHasGroup(d,g,p.id)).map(g=>g.id));
     const schedules=groupSchedulesSchema.safeParse(body.value.groupSchedules??[]);
     if(!ids.success)return reply({error:"Некорректный список групп"},400);
     if(!schedules.success)return reply({error:schedules.error.issues.map(i=>i.message).join(". ")},400);
     if(schedules.data.some(g=>!ids.data.includes(g.id)))return reply({error:"Расписание можно изменить только у выбранной группы"},400);
     const selected=ids.data.map(id=>groups.find(g=>g.id===id));
     if(selected.some(g=>!g||g.branch!==p.branch))return reply({error:"Выберите готовые группы в филиале учителя"},400);
     if(p.archived&&selected.length)return reply({error:"Сначала снимите назначенные группы"},400);
     p.groupAssignments=(selected as Group[]).map(g=>{const schedule=schedules.data.find(a=>a.id===g.id)??p.groupAssignments?.find(a=>a.groupId===g.id)??previous?.groupAssignments?.find(a=>a.groupId===g.id)??teacherGroup(d,g,p.id);return {groupId:g.id,days:schedule.days,startTime:schedule.startTime,endTime:schedule.endTime}});
     p.groups=[...new Set((selected as Group[]).map(g=>g.name))].join(", ");
     if(p.groups.length>2000)return reply({error:"Выбрано слишком много групп для одной карточки учителя"},400);
     for(const g of groups.filter(g=>g.teacherId===p.id||ids.data.includes(g.id)))if(!d.groups.some(other=>other.id===g.id))writes.push({kind:"group",value:g});
    }
    const assigned=d.people.filter(other=>other.teacherId===p.id&&!other.archived),owned=d.groups.filter(g=>g.teacherId===p.id);
    if(assigned.some(other=>other.branch!==p.branch)||owned.some(g=>g.branch!==p.branch))return reply({error:"Сначала измените связанные группы и переведите учеников"},400);
    if(p.archived&&(assigned.length||owned.length))return reply({error:"Сначала переведите учеников и группы к другому учителю"},400);
   }
  }
  if(kind==="check"&&"personId"in value){
   const p=d.people.find(p=>p.id===value.personId&&!p.archived);if(!p)return reply({error:"Человек не найден"},400);
   if(value.assessmentType==="reading"){
    const g=groups.find(g=>g.id===value.groupId),previous=d.checks.find(c=>c.id===value.id);
    const historical=previous?.assessmentType==="reading"&&previous.personId===p.id&&previous.groupId===value.groupId&&previous.teacherId===value.teacherId;
    if(p.kind!=="student"||!g||(!historical&&(!(g.teacherId===value.teacherId||teacherHasGroup(d,g,value.teacherId))||!groupStudents(d,g).some(s=>s.id===p.id))))return reply({error:"Ученик должен входить в выбранную группу"},400);
    if(!d.groups.some(other=>other.id===g.id))writes.push({kind:"group",value:g});
   }
  }
  if(kind==="exam"&&"juz"in value&&!d.people.some(p=>p.id===value.teacherId&&p.kind==="teacher"&&!p.archived))return reply({error:"Учитель не найден"},400);
  if(body.value.lessonTimes!==undefined&&(kind==="group"||kind==="person"&&"kind"in value&&value.kind==="teacher")){const times=lessonTimesSchema.safeParse(body.value.lessonTimes);if(!times.success)return reply({error:times.error.issues.map(i=>i.message).join(". ")},400);writes.push({kind:"settings",value:{id:"settings",...d.settings,lessonTimes:times.data}})}
  writes.push({kind,value});await saveRecords(dataset(req),writes);return reply({ok:true,id:value.id});
 }catch(e){console.error("Save analytics",e);return reply({error:"Не удалось сохранить запись. Ваши поля сохранены в форме; попробуйте ещё раз."},503)}
}
