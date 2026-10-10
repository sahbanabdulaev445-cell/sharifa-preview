export const branches = ["Гамидова", "Акушинского", "Каспийск", "Петра Первого"];
export type Branch = {id:string;name:string;source?:string};
export const branchNames = (data:Pick<Data,"branches">) => [...new Set([...branches,...(data.branches??[]).map(b=>b.name)])];
export const criteria = [{key:"makhraj",label:"Махрадж"},{key:"tajweed",label:"Таджвид"},{key:"hifz",label:"Хифз"},{key:"attendance",label:"Посещаемость"}] as const;
export type Scores = {makhraj:number;tajweed:number;hifz:number;attendance:number};
export type Person = {id:string;kind:"teacher"|"student";name:string;gender:"male"|"female";branch:string;groups:string;groupId?:string;teacherId?:string;age?:number;level?:string;startDate:string;archived?:boolean};
export type Group = {id:string;name:string;teacherId:string;branch:string;gender:"male"|"female";days:number[];startTime:string;endTime:string};
export const readingModes = [{value:"quran",label:"По Корану"},{value:"memory",label:"Наизусть"}] as const;
export type Check = {makhraj:number;tajweed:number;hifz?:number;attendance?:number;id:string;personId:string;date:string;note:string;createdAt?:string;assessmentType?:"reading";readingMode?:"quran"|"memory";groupId?:string;teacherId?:string};
export const checkCriteria = (check:Check) => check.assessmentType==="reading"?criteria.slice(0,2):criteria;
export type Exam = Scores & {id:string;teacherId:string;date:string;juz:number;note:string;createdAt?:string};
export type Settings = {weights:Scores & {students:number};attention:number;decline:number;examPass:number};
export type Data = {people:Person[];groups:Group[];branches?:Branch[];checks:Check[];exams:Exam[];settings:Settings};
export const defaults:Settings = {weights:{makhraj:20,tajweed:20,hifz:20,attendance:20,students:20},attention:7,decline:1,examPass:8};
export const emptyData:Data = {people:[],groups:[],branches:[],checks:[],exams:[],settings:defaults};
export const num = (v:number|null|undefined) => v==null?"—":v.toLocaleString("ru-RU",{minimumFractionDigits:1,maximumFractionDigits:1});
export const dateLabel = (v:string) => new Date(v+"T12:00:00").toLocaleDateString("ru-RU");
export const today = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Moscow"}).format(new Date());
export function periodBounds(period:string):{start:string;end:string}|null {
 if(period==="all")return null;
 if(period.startsWith("range:")){const [,start,end]=period.split(":");return {start,end}}
 if(/^\d{4}$/.test(period))return {start:`${period}-01-01`,end:`${period}-12-31`};
 const [year,month]=period.split("-").map(Number);
 return {start:`${period}-01`,end:`${period}-${String(new Date(year,month,0).getDate()).padStart(2,"0")}`};
}
export function inPeriod(date:string,period:string){const bounds=periodBounds(period);return !bounds||(date>=bounds.start&&date<=bounds.end)}
export function compareChecks(a:Pick<Check,"date"|"createdAt"|"id">,b:Pick<Check,"date"|"createdAt"|"id">){return b.date.localeCompare(a.date)||(b.createdAt??"").localeCompare(a.createdAt??"")||b.id.localeCompare(a.id)}
export function periodEndMonth(data:Data,period:string){return periodBounds(period)?.end.slice(0,7)??data.checks.map(c=>c.date.slice(0,7)).sort().at(-1)??today().slice(0,7)}
export function chartMonths(data:Data,period:string){
 const end=periodEndMonth(data,period),bounds=periodBounds(period);
 if(period==="all"||/^\d{4}-\d{2}$/.test(period)){const months=[end];for(let i=0;i<5;i++)months.unshift(previousMonth(months[0]));return months}
 const months:string[]=[];let month=bounds!.start.slice(0,7);
 while(month<=end){months.push(month);const [y,m]=month.split("-").map(Number);month=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,"0")}`}
 return months;
}
export const avg = (values:(number|null)[]) => {const clean=values.filter((v):v is number=>v!==null);return clean.length?clean.reduce((a,b)=>a+b,0)/clean.length:null};
export function weighted(s:Pick<Check,"makhraj"|"tajweed"|"hifz"|"attendance"|"assessmentType">,w:Settings["weights"],studentResult?:number|null) {if(s.assessmentType==="reading")return (s.makhraj+s.tajweed)/2;let total=0,weight=0;for(const c of criteria){const score=s[c.key];if(score!=null){total+=score*w[c.key];weight+=w[c.key]}}if(studentResult!=null){total+=studentResult*w.students;weight+=w.students}return weight?total/weight:null}
export function latest(data:Data,id:string,month="all") {return data.checks.filter(c=>c.personId===id&&inPeriod(c.date,month)).sort(compareChecks)[0]??null}
export function result(data:Data,p:Person,month="all"):number|null {const check=latest(data,p.id,month);const sr=p.kind==="teacher"?avg(studentsOf(data,p.id).map(s=>{const c=latest(data,s.id,month);return c?weighted(c,data.settings.weights):null})):null;if(!check)return sr;return weighted(check,data.settings.weights,sr)}
export function previousMonth(month:string) {const d=new Date(month+"-15T12:00:00");d.setMonth(d.getMonth()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
export function delta(data:Data,p:Person,month="all") {const c=latest(data,p.id,month);if(!c)return null;const currentMonth=c.date.slice(0,7);const now=result(data,p,month==="all"?currentMonth:month),before=result(data,p,previousMonth(currentMonth));return now!=null&&before!=null?now-before:null}
export function studentsOf(data:Data,id:string) {return data.people.filter(p=>p.kind==="student"&&!p.archived&&p.teacherId===id)}
export function alerts(data:Data,p:Person,month="all") {const c=latest(data,p.id,month);if(!c)return [];const out:string[]=[];for(const k of checkCriteria(c)){const score=c[k.key];if(score==null)continue;if(score<data.settings.attention)out.push(`${k.label}: ${num(score)}. ${p.kind==="teacher"?"Требуется проверка группы":"Рекомендуется повторная проверка"}.`);const prev=latest(data,p.id,previousMonth(c.date.slice(0,7))),before=prev?.[k.key];if(before!=null&&before-score>=data.settings.decline)out.push(`${k.label}: снижение на ${num(before-score)} балла за месяц.`)}const r=result(data,p,month);if(!out.length&&r!=null&&r<data.settings.attention)out.push(`Итог ${num(r)} ниже порога ${num(data.settings.attention)}. Рекомендуется проверка.`);return out}
export function demoData():Data {
 const people:Person[]=[],checks:Check[]=[],exams:Exam[]=[];
 const names=["Ахмад Абдуллаев","Мухаммад Магомедов","Фатима Ибрагимова","Аиша Алиева","Умар Гаджиев","Марьям Сулейманова","Али Юсупов","Хадиджа Расулова"];
 const bases=[9.2,8.9,9.0,8.7,6.4,8.4,8.6,7.9];
 const boy=["Ахмад","Мухаммад","Али","Усман","Юсуф","Ибрагим","Хасан","Исмаил","Умар","Муса","Абдуллах","Хусейн"];
 const girl=["Марьям","Аиша","Фатима","Хадиджа","Сафия","Зайнаб","Асия","Сумайя","Хафса","Амина","Рукия","Сара"];
 const clamp=(n:number)=>Math.max(0,Math.min(10,Math.round(n*10)/10));
 names.forEach((name,i)=>{const id=`teacher-${i+1}`,gender=i===2||i===3||i===5||i===7?"female":"male";people.push({id,kind:"teacher",name,gender,branch:branches[Math.floor(i/2)],groups:`${i+1}А, ${i+1}Б`,startDate:`2023-0${i%7+1}-01`});
  for(let m=5;m<=10;m++){let base=bases[i]-(10-m)*.13;if(i===4)base=m<10?6.7:6.4;checks.push({id:`tc-${i}-${m}`,personId:id,date:`2026-${String(m).padStart(2,"0")}-${m===10?"04":"25"}`,makhraj:clamp(base-.2),tajweed:clamp(base-(i===4?.5:.4)),hifz:clamp(base+.4),attendance:clamp(base+.2),note:m===10&&i===4?"Повторить правила таджвида в обеих группах.":"Плановая проверка"})}
  for(let j=0;j<12;j++){const sid=`student-${i+1}-${j+1}`,female=gender==="female";people.push({id:sid,kind:"student",name:`${(female?girl:boy)[j]} ${["Магомедов","Алиев","Гаджиев","Ибрагимов","Расулов","Юсупов"][j%6]}${female?"а":""}`,gender,branch:branches[Math.floor(i/2)],groups:`${i+1}${j<6?"А":"Б"}`,teacherId:id,age:8+j%9,level:j<4?"Начальный":j<8?"Средний":"Продвинутый",startDate:"2026-02-01"});for(let m=5;m<=10;m++){const b=bases[i]+.5-(j%5)*.28-(10-m)*.1;checks.push({id:`sc-${i}-${j}-${m}`,personId:sid,date:`2026-${String(m).padStart(2,"0")}-${m===10?"03":"24"}`,makhraj:clamp(b-(i===4&&j===0&&m===10?1.3:.1)),tajweed:clamp(b-.2),hifz:clamp(b+.2),attendance:clamp(b+.3),note:"Проверка чтения и заучивания"})}}
  [7.8,8.6,9.3].forEach((v,j)=>exams.push({id:`exam-${i}-${j}`,teacherId:id,date:`2026-0${7+j}-15`,juz:30,makhraj:clamp(v-.2+(i%3)*.1),tajweed:clamp(v-.4),hifz:clamp(v+.2),attendance:clamp(v+.4),note:"Повышение квалификации"}));
 });return {people,groups:[],checks,exams,settings:structuredClone(defaults)};
}
