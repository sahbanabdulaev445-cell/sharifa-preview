import {Branch,Data,branches,branchEntries,branchNames,defaultBranchId} from "./analytics";
export type BranchAction={id:string;action:"update"|"delete"|"restore";name?:string;address?:string;phone?:string;note?:string;destination?:string};
export function planBranchAction(data:Data,action:BranchAction){
 const entry=branchEntries(data).find(b=>b.id===action.id);
 if(!entry)throw new Error("Филиал не найден. Обновите страницу.");
 const saved=data.branches?.find(b=>b.id===entry.id);
 const value:Branch={...entry,...(!saved&&branches.includes(entry.name)?{replaces:entry.name}:{} )};
 const writes:{kind:string;value:{id:string;[key:string]:unknown}}[]=[];
 const people=data.people.filter(p=>p.branch===entry.name),groups=data.groups.filter(g=>g.branch===entry.name);
 let destination:string|undefined;
 if(action.action==="update"){
  if(entry.archived)throw new Error("Сначала восстановите филиал.");
  const name=action.name?.trim();if(!name)throw new Error("Введите название филиала.");
  if(branchEntries(data).some(b=>!b.archived&&b.id!==entry.id&&b.name.toLocaleLowerCase("ru")===name.toLocaleLowerCase("ru")))throw new Error("Филиал с таким названием уже существует.");
  destination=name!==entry.name?name:undefined;
  Object.assign(value,{name,address:action.address?.trim()||undefined,phone:action.phone?.trim()||undefined,note:action.note?.trim()||undefined});
 }else if(action.action==="delete"){
  if(entry.archived)throw new Error("Филиал уже удалён.");
  if(people.length||groups.length){if(!action.destination||action.destination===entry.name||!branchNames(data).includes(action.destination))throw new Error("Выберите филиал для переноса связанных карточек и групп.");destination=action.destination}
  value.archived=true;
 }else{
  if(!entry.archived)throw new Error("Филиал уже восстановлен.");
  if(branchEntries(data).some(b=>!b.archived&&b.id!==entry.id&&b.name.toLocaleLowerCase("ru")===entry.name.toLocaleLowerCase("ru")))throw new Error("Филиал с таким названием уже существует. Переименуйте действующий филиал перед восстановлением.");
  delete value.archived;
 }
 if(destination){for(const p of people)writes.push({kind:"person",value:{...p,branch:destination}});for(const g of groups)writes.push({kind:"group",value:{...g,branch:destination}})}
 if(action.action!=="restore")for(const other of data.branches??[]){if(other.id===entry.id||other.source!==entry.name)continue;const next={...other};if(action.action==="update")next.source=value.name;else delete next.source;writes.push({kind:"branch",value:next})}
 if(value.replaces&&value.id!==defaultBranchId(value.replaces))throw new Error("Некорректная запись исходного филиала.");
 writes.push({kind:"branch",value});return writes;
}
