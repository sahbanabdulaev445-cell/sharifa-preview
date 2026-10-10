import {env} from "cloudflare:workers";
import {Data,demoData,emptyData} from "./analytics";
export function db(){if(!env.DB)throw new Error("Хранилище временно недоступно");return env.DB}
const key=(dataset:string,id:string)=>`${dataset}:${id}`;
export async function readData(dataset:string):Promise<Data>{
 const database=db();
 if(dataset==="demo"){
  const ready=await database.prepare("SELECT id FROM records WHERE id = ?").bind(key(dataset,"initialized")).first();
  if(!ready){const d=demoData();const entries=[...d.people.map(p=>({kind:"person",value:p})),...d.checks.map(p=>({kind:"check",value:p})),...d.exams.map(p=>({kind:"exam",value:p})),{kind:"settings",value:{id:"settings",...d.settings}}];for(let i=0;i<entries.length;i+=75)await database.batch(entries.slice(i,i+75).map(e=>database.prepare("INSERT OR IGNORE INTO records (id, dataset, kind, payload) VALUES (?, ?, ?, ?)").bind(key(dataset,e.value.id),dataset,e.kind,JSON.stringify(e.value))));await database.prepare("INSERT OR IGNORE INTO records (id, dataset, kind, payload) VALUES (?, ?, ?, ?)").bind(key(dataset,"initialized"),dataset,"marker","{}").run()}
 }
 const rows=await database.prepare("SELECT kind, payload FROM records WHERE dataset = ?").bind(dataset).all<{kind:string;payload:string}>();
 const d:Data=structuredClone(emptyData);for(const r of rows.results){const value=JSON.parse(r.payload);if(r.kind==="person")d.people.push(value);if(r.kind==="group")d.groups.push(value);if(r.kind==="branch")d.branches!.push(value);if(r.kind==="check")d.checks.push(value);if(r.kind==="exam")d.exams.push(value);if(r.kind==="settings")d.settings=value}return d;
}
export async function saveRecord(dataset:string,kind:string,value:{id:string}){await db().prepare("INSERT INTO records (id, dataset, kind, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload WHERE records.kind = excluded.kind AND records.dataset = excluded.dataset").bind(key(dataset,value.id),dataset,kind,JSON.stringify(value)).run()}
export async function saveRecords(dataset:string,records:{kind:string;value:{id:string}}[]){await db().batch(records.map(({kind,value})=>db().prepare("INSERT INTO records (id, dataset, kind, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload WHERE records.kind = excluded.kind AND records.dataset = excluded.dataset").bind(key(dataset,value.id),dataset,kind,JSON.stringify(value))))}
