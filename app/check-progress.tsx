"use client";
import {Check,Data,checkProgress,dateLabel,num} from "@/lib/analytics";
import {Trend} from "./analytics";

export default function CheckProgress({data,check,compact=false}:{data:Data;check:Check;compact?:boolean}){
 const progress=checkProgress(data,check);
 const tips={letters:"Повторите буквы.",rules:"Закрепите правила таджвида.",reading:"Потренируйте чтение.",makhraj:"Повторите произношение букв.",tajweed:"Закрепите правила таджвида.",hifz:"Повторите заученные суры и аяты.",attendance:"Обратите внимание на регулярность занятий."};
 return <section className={`check-progress ${compact?"compact":""}`} aria-label="Последняя проверка и прогресс">
  <div className="check-progress-heading"><div><b>Последняя проверка · {dateLabel(check.date)}</b><span>Итог {num(progress.score)} / 10{progress.previous?` · Предыдущая: ${dateLabel(progress.previous.date)}, итог ${num(progress.before)}`:" · Первая проверка этого типа"}</span></div>{progress.previous&&progress.totalChange!==null&&<Trend value={progress.totalChange}/>}</div>
  {progress.previous&&progress.totalChange===null&&<p className="check-progress-note">Состав оценок изменился. Сравнение — по отдельным показателям.</p>}
  <div className="check-progress-metrics">{progress.metrics.map(c=><div key={c.key}><span>{c.label}</span><b>{num(c.value)} <small>/ 10</small></b>{c.before!==null?<span className="metric-comparison">Было {num(c.before)} <Trend value={c.change}/></span>:<small>{progress.previous?"Ранее не оценивался":"Пока без сравнения"}</small>}</div>)}</div>
  <p className="check-insight"><b>Лучше получается:</b> {progress.strongest.map(c=>c.label.toLocaleLowerCase("ru")).join(", ")} ({num(progress.strongest[0].value)}).</p>
  <p className="check-insight">{progress.needsWork.length?<><b>Нужно подтянуть:</b> {progress.needsWork.map(c=>`${c.label.toLocaleLowerCase("ru")} (${num(c.value)})`).join(", ")}. Ориентир — {num(data.settings.attention)}. {progress.needsWork.map(c=>tips[c.key]).join(" ")}</>:<>Все оценённые показатели достигли {num(data.settings.attention)}. Продолжайте закреплять результат.</>}</p>
 </section>;
}
