import {Data,demoData,emptyData} from "../lib/analytics";
import {Backup,validateBackup} from "../lib/backup-format";

export const PREVIEW_STORAGE_KEY="sharifa-github-preview-v1";
type State={version:1;demo:Data;work:Data};
function state():State{
 const saved=localStorage.getItem(PREVIEW_STORAGE_KEY);
 if(saved){const value=JSON.parse(saved) as State;if(value.version!==1||!value.demo||!value.work)throw new Error("Некорректный формат данных проверки");return value}
 const initial:State={version:1,demo:demoData(),work:structuredClone(emptyData)};
 localStorage.setItem(PREVIEW_STORAGE_KEY,JSON.stringify(initial));return initial;
}
function selected(dataset:string):"work"|"demo"{return dataset==="work"?"work":"demo"}
function settingsValue(value:Record<string,unknown>){const settings={...value};delete settings.id;return settings as unknown as Data["settings"]}
export async function readData(dataset:string):Promise<Data>{return structuredClone(state()[selected(dataset)])}
export async function saveRecords(dataset:string,records:{kind:string;value:{id:string}}[]){
 const next=state(),data=next[selected(dataset)];
 for(const {kind,value} of records){
  if(kind==="settings"){data.settings=settingsValue(value);continue}
  const fields={person:"people",group:"groups",branch:"branches",check:"checks",exam:"exams"} as const;
  const field=fields[kind as keyof typeof fields];if(!field)throw new Error("Неизвестный тип записи");
  const list=(data[field]??=[]) as {id:string}[],index=list.findIndex(record=>record.id===value.id);
  if(index<0)list.push(value);else list[index]=value;
 }
 // One localStorage replacement commits the whole transfer or nothing.
 localStorage.setItem(PREVIEW_STORAGE_KEY,JSON.stringify(next));
}
export async function exportBackup():Promise<Backup>{
 const saved=state(),records:Backup["records"]=[];
 for(const dataset of ["demo","work"] as const){
  const data=saved[dataset];
  for(const [kind,values] of [["person",data.people],["group",data.groups],["branch",data.branches??[]],["check",data.checks],["exam",data.exams]] as const){
   for(const value of values)records.push({id:`${dataset}:${value.id}`,dataset,kind,value:{...value}});
  }
  records.push({id:`${dataset}:settings`,dataset,kind:"settings",value:{id:"settings",...data.settings}});
 }
 records.push({id:"demo:initialized",dataset:"demo",kind:"marker",value:{}});
 return validateBackup({format:"sharifa-director-analytics",version:3,exportedAt:new Date().toISOString(),records});
}
export async function restoreBackup(input:unknown){
 const backup=validateBackup(input),next:State={version:1,demo:structuredClone(emptyData),work:structuredClone(emptyData)};
 for(const {dataset,kind,value} of backup.records){
  if(kind==="marker")continue;
  if(kind==="settings"){next[dataset].settings=settingsValue(value);continue}
  const field=({person:"people",group:"groups",branch:"branches",check:"checks",exam:"exams"} as const)[kind];
  (next[dataset][field]??=[]) .push(value as never);
 }
 localStorage.setItem(PREVIEW_STORAGE_KEY,JSON.stringify(next));return backup.records.length;
}
