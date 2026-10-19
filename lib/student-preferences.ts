import {Data,Person,branchNames,today} from "./analytics";
import {studentLevels,studentLevel} from "./levels";
import {availableGroups,teacherHasGroup} from "./groups";
import {birthYearSchema} from "./record-schemas";

const fields=["gender","branch","teacherId","groupId","groups","birthYear","level"] as const;
const key=(scope:string)=>`sharifa-student-defaults-v1:${scope==="demo"?"demo":"work"}`;
const yearsKey="sharifa-birth-years-v1";
export const defaultBirthYears=Array.from({length:9},(_,i)=>2012+i);
export function studentInitialValues(data:Data,scope:string,context:Partial<Person>={}):Record<string,string>{
 const values:Record<string,string>={gender:"male",branch:branchNames(data)[0]??"",teacherId:"",groupId:"",groups:"",birthYear:"2018",level:"Начальный",startDate:today()};
 try{const saved=JSON.parse(localStorage.getItem(key(scope))??"{}");for(const field of fields)if(typeof saved?.[field]==="string")values[field]=saved[field]}catch{}
 for(const field of fields)if(context[field]!=null)values[field]=String(context[field]);
 if(!["male","female"].includes(values.gender))values.gender="male";
 if(!branchNames(data).includes(values.branch))values.branch=branchNames(data)[0];
 values.level=studentLevel(values.level);
 if(!(studentLevels as readonly string[]).includes(values.level))values.level="Начальный";
 if(values.birthYear&&!birthYearSchema.safeParse(Number(values.birthYear)).success)values.birthYear="";
 if(!data.people.some(p=>p.id===values.teacherId&&p.kind==="teacher"&&!p.archived&&p.branch===values.branch))values.teacherId="";
 const group=availableGroups(data).find(g=>(values.groupId?g.id===values.groupId:g.name===values.groups)&&g.branch===values.branch&&g.gender===values.gender&&(!values.teacherId||teacherHasGroup(data,g,values.teacherId)));
 values.groupId=group?.id??"";values.groups=group?.name??"";
 return values;
}
export function rememberStudentValues(values:Record<string,string>,scope:string){
 try{localStorage.setItem(key(scope),JSON.stringify(Object.fromEntries(fields.map(field=>[field,values[field]??""]))));return true}catch{return false}
}
export function birthYearSuggestions(){
 try{const saved=JSON.parse(localStorage.getItem(yearsKey)??"[]");return [...new Set([...defaultBirthYears,...(Array.isArray(saved)?saved.filter(y=>birthYearSchema.safeParse(y).success):[])])].sort((a,b)=>a-b)}catch{return [...defaultBirthYears]}
}
export function rememberBirthYear(year:number){
 if(!birthYearSchema.safeParse(year).success)return false;
 try{localStorage.setItem(yearsKey,JSON.stringify([...new Set([...birthYearSuggestions(),year])].sort((a,b)=>a-b)));return true}catch{return false}
}
