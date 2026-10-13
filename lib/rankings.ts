import {Data,Group,Person,avg,result} from "./analytics";
import {availableGroups,groupStudents,groupTeachers} from "./groups";

export type RankingFilters={branch:string;teacherGender:string;teacherId:string;search:string};
export type GroupRanking={group:Group;teachers:Person[];students:Person[];assessed:number;score:number|null;rank:number|null};
export type BranchRanking={name:string;groups:number;teachers:Person[];students:Person[];assessed:number;score:number|null;rank:number|null};
const matches=(text:string,query:string)=>text.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"));
function rankRows<T extends {score:number|null;rank:number|null}>(rows:T[],name:(row:T)=>string):T[]{
 rows.sort((a,b)=>(b.score??-1)-(a.score??-1)||name(a).localeCompare(name(b),"ru",{numeric:true}));
 let previous:number|null=null,rank=0;
 return rows.map((row,index)=>{
  if(row.score===null)return {...row,rank:null};
  if(previous===null||Math.abs(previous-row.score)>1e-9)rank=index+1;
  previous=row.score;
  return {...row,rank};
 });
}
export function groupRankings(data:Data,period:string,filters:RankingFilters):GroupRanking[]{
 const rows:GroupRanking[]=[];
 for(const group of availableGroups(data)){
  if(filters.branch!=="all"&&group.branch!==filters.branch)continue;
  const teachers=groupTeachers(data,group).filter(t=>(filters.teacherGender==="all"||t.gender===filters.teacherGender)&&(filters.teacherId==="all"||t.id===filters.teacherId));
  if(!teachers.length||!matches(`${group.name} ${group.branch} ${teachers.map(t=>t.name).join(" ")}`,filters.search))continue;
  const students=groupStudents(data,group),scores=students.map(p=>result(data,p,period));
  rows.push({group,teachers,students,assessed:scores.filter(s=>s!==null).length,score:avg(scores),rank:null});
 }
 return rankRows(rows,row=>`${row.group.name} ${row.group.branch} ${row.group.id}`);
}
export function branchRankings(data:Data,period:string,filters:RankingFilters):BranchRanking[]{
 const groups=groupRankings(data,period,{...filters,search:""}),rows:BranchRanking[]=[];
 for(const name of new Set(groups.map(row=>row.group.branch))){
  if(!matches(name,filters.search))continue;
  const own=groups.filter(row=>row.group.branch===name);
  const students=[...new Map(own.flatMap(row=>row.students).map(p=>[p.id,p])).values()];
  const teachers=[...new Map(own.flatMap(row=>row.teachers).map(p=>[p.id,p])).values()];
  const scores=students.map(p=>result(data,p,period));
  rows.push({name,groups:own.length,students,teachers,assessed:scores.filter(s=>s!==null).length,score:avg(scores),rank:null});
 }
 return rankRows(rows,row=>row.name);
}
