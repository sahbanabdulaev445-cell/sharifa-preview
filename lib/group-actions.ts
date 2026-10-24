import {Data,Group,Person,branchNames} from "./analytics";
import {availableGroups,groupStudents,teacherHasGroup} from "./groups";
export function planGroupAction(data:Data,action:{id:string;action:"archive"|"restore"}){
 const groups=availableGroups(data),group=data.groups.find(g=>g.id===action.id)??groups.find(g=>g.id===action.id);
 if(!group||Boolean(group.archived)!==(action.action==="restore"))throw new Error("Группа не найдена. Обновите список.");
 const writes:{kind:"group"|"person";value:Group|Person}[]=[];
 if(action.action==="restore"){
  if(!branchNames(data).includes(group.branch)||!data.people.some(p=>p.id===group.teacherId&&p.kind==="teacher"&&!p.archived&&p.branch===group.branch))throw new Error("Сначала восстановите филиал и учителя группы.");
  if(groups.some(g=>g.id!==group.id&&g.teacherId===group.teacherId&&g.name===group.name&&g.gender===group.gender))throw new Error("У учителя уже есть группа с таким названием. Переименуйте действующую группу перед восстановлением.");
  const teacher=data.people.find(p=>p.id===group.teacherId)!;
  const names=[...new Set([...teacher.groups.split(",").map(n=>n.trim()).filter(Boolean),group.name])].join(", ");
  const assignments=teacher.groupAssignments?[...teacher.groupAssignments.filter(a=>a.groupId!==group.id),...(group.days.length&&group.startTime&&group.endTime?[{groupId:group.id,days:group.days,startTime:group.startTime,endTime:group.endTime}]:[])]:undefined;
  if(names.length>2000||(assignments?.length??0)>500)throw new Error("У учителя слишком много групп. Освободите место в его карточке перед восстановлением.");
  return [{kind:"group" as const,value:{...group,archived:false}},{kind:"person" as const,value:{...teacher,groups:names,...(assignments?{groupAssignments:assignments}:{})}}];
 }
 writes.push({kind:"group",value:{...group,archived:true}});
 // Keep the historical group record, while detaching active and archived pupils.
 const students=groupStudents({...data,people:data.people.map(p=>({...p,archived:false}))},group);
 for(const p of students)writes.push({kind:"person",value:{...p,groupId:undefined,groups:""}});
 for(const teacher of data.people.filter(p=>p.kind==="teacher"&&(p.id===group.teacherId||p.groupAssignments?.some(a=>a.groupId===group.id)||teacherHasGroup(data,group,p.id)))){
  const remaining=groups.filter(g=>g.id!==group.id&&teacherHasGroup(data,g,teacher.id));
  // Materialize other legacy groups before replacing the teacher's textual list.
  for(const g of remaining)if(!data.groups.some(v=>v.id===g.id)&&!writes.some(w=>w.value.id===g.id))writes.push({kind:"group",value:g});
  writes.push({kind:"person",value:{...teacher,groups:[...new Set(remaining.map(g=>g.name))].join(", "),...(teacher.groupAssignments?{groupAssignments:teacher.groupAssignments.filter(a=>a.groupId!==group.id)}:{})}});
 }
 return writes;
}
