import {Data,Group,Person,avg,checkCriteria,latest,result,weighted,teachesGroup} from "./analytics";

export const weekdays=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
function legacyId(teacherId:string,name:string,gender:string){
 let a=2166136261,b=5381;
 for(const char of `${teacherId}:${name}:${gender}`){a=Math.imul(a^char.charCodeAt(0),16777619);b=Math.imul(b,33)^char.charCodeAt(0)}
 return `group-${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`;
}
// Existing text groups remain available until their schedule is first saved.
export function availableGroups(data:Data):Group[]{
 const groups=[...(data.groups??[])];
 for(const teacher of data.people.filter(p=>p.kind==="teacher"&&!p.archived&&p.groupAssignments===undefined)){
  const names=new Set([...teacher.groups.split(",").map(n=>n.trim()).filter(Boolean),...data.people.filter(p=>p.kind==="student"&&!p.archived&&p.teacherId===teacher.id&&!p.groupId&&p.groups).map(p=>p.groups)]);
  for(const name of names){
   const students=data.people.filter(p=>p.kind==="student"&&!p.archived&&p.teacherId===teacher.id&&p.groups===name&&!p.groupId);
   const genders=[...new Set([...students.map(p=>p.gender),...groups.filter(g=>g.teacherId===teacher.id&&g.name===name).map(g=>g.gender)])];
   if(!genders.length)genders.push(teacher.gender);
   for(const gender of genders)if(!groups.some(g=>g.teacherId===teacher.id&&g.name===name&&g.gender===gender))groups.push({id:legacyId(teacher.id,name,gender),name,teacherId:teacher.id,branch:teacher.branch,gender,days:[],startTime:"",endTime:""});
  }
 }
 return groups.filter(g=>data.people.some(p=>p.kind==="teacher"&&!p.archived&&p.branch===g.branch&&(p.id===g.teacherId||teachesGroup(p,g)))).sort((a,b)=>a.name.localeCompare(b.name,"ru",{numeric:true})||a.branch.localeCompare(b.branch,"ru"));
}
export function groupStudents(data:Data,group:Group):Person[]{return data.people.filter(p=>p.kind==="student"&&!p.archived&&(p.groupId?p.groupId===group.id:p.teacherId===group.teacherId&&p.branch===group.branch&&p.groups===group.name&&p.gender===group.gender)).sort((a,b)=>a.name.localeCompare(b.name,"ru"))}
export function groupResult(data:Data,group:Group,period="all"){return avg(groupStudents(data,group).map(p=>result(data,p,period)))}
export function priorityStudents(data:Data,group:Group){return groupStudents(data,group).filter(p=>{const c=latest(data,p.id);return c&&(checkCriteria(c).some(k=>(c[k.key]??10)<data.settings.attention)||(weighted(c,data.settings.weights)??10)<data.settings.attention)}).sort((a,b)=>(result(data,a)??10)-(result(data,b)??10)||a.name.localeCompare(b.name,"ru"))}
export function scheduleLabel(group:Group){return group.days.length&&group.startTime?`${[...group.days].sort((a,b)=>a-b).map(d=>weekdays[d]).join(", ")} · ${group.startTime}${group.endTime?`–${group.endTime}`:""}`:"Расписание не задано"}

export function teacherHasGroup(data:Data,group:Group,teacherId:string){const teacher=data.people.find(p=>p.id===teacherId&&p.kind==="teacher"&&!p.archived);return !!teacher&&teacher.branch===group.branch&&teachesGroup(teacher,group)}
export function teacherGroup(data:Data,group:Group,teacherId:string):Group{const a=data.people.find(p=>p.id===teacherId)?.groupAssignments?.find(a=>a.groupId===group.id);return a?{...group,days:a.days,startTime:a.startTime,endTime:a.endTime}:group}
export function groupTeachers(data:Data,group:Group){return data.people.filter(p=>p.kind==="teacher"&&!p.archived&&teacherHasGroup(data,group,p.id))}
