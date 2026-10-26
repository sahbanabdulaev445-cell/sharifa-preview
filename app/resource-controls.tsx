"use client";

import {Cloud,Database,ExternalLink,Gauge,HardDrive,Info,ShieldCheck,X,Zap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from "@/components/ui/dialog";
import type {Data} from "@/lib/analytics";

const quotaGuide="https://yandex.cloud/ru/docs/billing/concepts/serverless-free-tier";
const quotas=[
 {name:"База данных",service:"YDB Serverless",icon:Database,limits:["1 000 000 RU в месяц","720 ГиБ·час хранения в месяц"],detail:"Запросы, записи и объём базы"},
 {name:"Серверные функции",service:"Cloud Functions",icon:Zap,limits:["1 000 000 вызовов в месяц","10 ГиБ·час вычислений в месяц"],detail:"Обработка действий в CRM"},
 {name:"Запросы сайта",service:"API Gateway",icon:Gauge,limits:["100 000 запросов в месяц"],detail:"Обращения к сайту и API"},
 {name:"Файлы и копии",service:"Object Storage",icon:HardDrive,limits:["1 ГиБ хранения","10 000 операций записи в месяц","100 000 операций чтения в месяц"],detail:"Сайт и зашифрованные архивы"},
];
const count=(n:number)=>n.toLocaleString("ru-RU");
function jsonSize(data:Data){const bytes=new TextEncoder().encode(JSON.stringify(data)).byteLength;return bytes<1024*1024?`${(bytes/1024).toLocaleString("ru-RU",{maximumFractionDigits:1})} КиБ`:`${(bytes/1024/1024).toLocaleString("ru-RU",{maximumFractionDigits:2})} МиБ`}

export default function ResourceControls({data,dataset}:{data:Data;dataset:string}) {
 return <Dialog><DialogTrigger asChild><Button type="button" variant="outline" className="resources-trigger"><Gauge aria-hidden size={18}/>Ресурсы</Button></DialogTrigger>
  <DialogContent className="resources-dialog" showCloseButton={false}>
   <DialogHeader className="resources-header"><div className="resources-heading-icon"><Gauge aria-hidden size={23}/></div><div><DialogTitle>Ресурсы и бесплатные квоты</DialogTitle><DialogDescription>Контроль базы, запросов и резервных копий</DialogDescription></div><DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Закрыть ресурсы"><X aria-hidden size={20}/></Button></DialogClose></DialogHeader>
   <div className="resources-body">
    <div className="resources-policy"><span><ShieldCheck aria-hidden size={17}/>Только бесплатный вариант</span><span>Контрольный порог <b>80%</b></span></div>
    <div className="resources-connection" role="status"><Cloud aria-hidden size={24}/><div><h3>Облако ещё не подключено</h3><p>Расход Yandex Cloud пока недоступен. Прочерк означает отсутствие данных, а не нулевой расход.</p></div></div>
    <div className="resources-section-heading"><h3>Облачные ресурсы</h3><span>Показатели за месяц</span></div>
    <div className="resources-grid">{quotas.map(({name,service,icon:Icon,limits,detail})=><section className="resource-card" key={service} aria-label={name}>
     <div className="resource-card-heading"><span className="resource-icon"><Icon aria-hidden size={18}/></span><div><h4>{name}</h4><span>{service}</span></div><span className="resource-unknown" aria-label="Расход неизвестен">—</span></div>
     <p className="resource-detail">{detail}</p><div className="resource-track" aria-hidden><i/><span>80%</span></div><p className="resource-unavailable">Нет показаний</p>
     <div className="resource-limits"><b>Бесплатный объём</b>{limits.map(limit=><span key={limit}>{limit}</span>)}</div>
    </section>)}</div>
    <div className="resources-notice"><Info aria-hidden size={18}/><p>Квоты общие для всего платёжного аккаунта. Порог 80% выбран; автоматические уведомления ещё не подключены. Предупреждение само по себе не останавливает начисления.</p></div>
    <section className="resources-local"><div className="resources-section-heading"><h3>Данные в этой CRM</h3><span>{dataset==="demo"?"Учебный пример":"Рабочие данные"}</span></div><dl>
     <div><dt>Ученики</dt><dd>{count(data.people.filter(p=>p.kind==="student").length)}</dd></div>
     <div><dt>Учителя</dt><dd>{count(data.people.filter(p=>p.kind==="teacher").length)}</dd></div>
     <div><dt>Группы</dt><dd>{count(data.groups.length)}</dd></div>
     <div><dt>Проверки и экзамены</dt><dd>{count(data.checks.length+data.exams.length)}</dd></div>
     <div><dt>Размер JSON ≈</dt><dd>{jsonSize(data)}</dd></div>
    </dl><p>Включая удалённые карточки. Размер относится к выбранному набору данных, без индексов и копий; это не объём YDB или всего хранилища браузера.</p></section>
   </div>
   <div className="resources-footer"><a href={quotaGuide} target="_blank" rel="noopener noreferrer">Условия бесплатных квот <ExternalLink aria-hidden size={14}/></a><a className="resources-console" href="https://console.yandex.cloud/" target="_blank" rel="noopener noreferrer">Консоль Yandex Cloud <ExternalLink aria-hidden size={15}/></a></div>
  </DialogContent>
 </Dialog>;
}
