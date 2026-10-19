import {Data,Group,Person} from "./analytics";
import {availableGroups,groupStudents,teacherGroup,teacherHasGroup} from "./groups";
export type PeopleAction={id:string;action:"archive"|"restore";personKind:"student"|"teacher";ids:string[];replacements?:Record<string,string>};
export function teacherTransferNeeds(data:Data,ids:string[]){
 const selected=new Set(ids),groups=availableGroups(data);
 return [...new Set(data.people.filter(p=>p.kind==="teacher"&&selected.has(p.id)).filter(t=>groups.some(g=>g.teacherId===t.id)||data.people.some(p=>p.kind==="student"&&p.teacherId===t.id)).map(t=>t.branch))];
}
export function planPeopleAction(data:Data,action:PeopleAction):{kind:"person"|"group";value:Person|Group}[]{
 const ids=new Set(action.ids),people=action.ids.map(id=>data.people.find(p=>p.id===id));
 if(people.some(p=>!p||p.kind!==action.personKind||Boolean(p.archived)!==(action.action==="restore")))throw new Error("Список изменился. Обновите страницу и выберите карточки заново.");
 const selected=people as Person[],next=new Map<string,Person>(),groupWrites=new Map<string,Group>();
 if(action.action==="restore")return selected.map(p=>({kind:"person",value:{...p,archived:false}}));
 if(action.personKind==="student")return selected.map(p=>({kind:"person",value:{...p,archived:true}}));
 const groups=availableGroups(data),destinations=new Map<string,Person>();
 for(const branch of teacherTransferNeeds(data,action.ids)){
  const t=data.people.find(p=>p.id===action.replacements?.[branch]&&p.kind==="teacher"&&!p.archived&&!ids.has(p.id)&&p.branch===branch);
  if(!t)throw new Error(`Филиал «${branch}»: выберите действующего учителя для переноса учеников и групп.`);
  destinations.set(branch,t);
 }
 for(const t of selected)next.set(t.id,{...t,archived:true,groups:"",groupAssignments:[]});
 const added=new Map<string,Set<string>>();
 const addGroup=(target:Person,g:Group)=>{if(!added.has(target.id))added.set(target.id,new Set());added.get(target.id)!.add(g.id);if(!data.groups.some(v=>v.id===g.id))groupWrites.set(g.id,g)};
 for(const g of groups)if(ids.has(g.teacherId)){const t=destinations.get(g.branch)!;const moved={...g,teacherId:t.id};groupWrites.set(g.id,moved);addGroup(t,moved)}
 for(const p of data.people.filter(p=>p.kind==="student"&&ids.has(p.teacherId??""))){
  const t=destinations.get(p.branch);if(!t)throw new Error("Не найден учитель для переноса учеников.");
  const g=groups.find(g=>p.groupId?g.id===p.groupId:groupStudents(data,g).some(s=>s.id===p.id));
  if(g)addGroup(t,groupWrites.get(g.id)??g);
  next.set(p.id,{...p,teacherId:t.id,...(g?{groupId:g.id,groups:g.name}:{})});
 }
 for(const target of destinations.values()){
  const existing=groups.filter(g=>teacherHasGroup(data,g,target.id));
  const assigned=new Map(existing.map(g=>[g.id,{groupId:g.id,...(({days,startTime,endTime})=>({days,startTime,endTime}))(teacherGroup(data,g,target.id))}]));
  for(const gid of added.get(target.id)??[]){const g=groupWrites.get(gid)??groups.find(g=>g.id===gid)!;if(!assigned.has(gid))assigned.set(gid,{groupId:gid,days:g.days,startTime:g.startTime,endTime:g.endTime})}
  const names=[...new Set([...assigned.keys()].map(gid=>(groupWrites.get(gid)??groups.find(g=>g.id===gid))!.name))].join(", ");
  if(assigned.size>500||names.length>2000)throw new Error("У выбранного учителя слишком много групп. Удаляйте учителей по очереди и распределите группы между несколькими учителями.");
  next.set(target.id,{...target,groupAssignments:[...assigned.values()],groups:names});
 }
 return [...[...groupWrites.values()].map(value=>({kind:"group" as const,value})),...[...next.values()].map(value=>({kind:"person" as const,value}))];
}
