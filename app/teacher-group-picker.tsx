"use client";
import {useState} from "react";
import {X,Search} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Data} from "@/lib/analytics";
import {availableGroups,scheduleLabel} from "@/lib/groups";

export default function TeacherGroupPicker({data,branch,teacherId,value,onChange}:{data:Data;branch:string;teacherId:string;value:string[];onChange:(ids:string[])=>void}){
 const [search,setSearch]=useState("");
 const groups=availableGroups(data).filter(g=>g.branch===branch);
 const shown=groups.filter(g=>`${g.name} ${data.people.find(t=>t.id===g.teacherId)?.name??""}`.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));
 return <fieldset className="group-members teacher-group-picker full"><legend>Группы учителя · выбрано {value.length}</legend>
 <div className="selected-groups">{groups.filter(g=>value.includes(g.id)).map(g=><span key={g.id}>{g.name} · {g.gender==="female"?"Девочки":"Мальчики"}{g.teacherId!==teacherId&&<button type="button" aria-label={`Убрать группу ${g.name}`} onClick={()=>onChange(value.filter(id=>id!==g.id))}><X size={14}/></button>}</span>)}</div>
 <div className="search-box"><Search aria-hidden size={16}/><Input id="teacher-group-search" aria-label="Поиск готовой группы" placeholder="Начните писать название группы или имя учителя" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <p className="group-helper">Выберите готовые группы этого филиала. Группы другого учителя перейдут к этому учителю вместе с учениками. Свои группы можно передать в карточке другого учителя или в настройках группы.</p>
 <div className="group-member-list" aria-live="polite">{shown.map(g=><label key={g.id}><input type="checkbox" checked={value.includes(g.id)} disabled={g.teacherId===teacherId} onChange={e=>onChange(e.target.checked?[...value,g.id]:value.filter(id=>id!==g.id))}/><span><b>{g.name} · {g.gender==="female"?"Девочки":"Мальчики"}</b><small>{data.people.find(t=>t.id===g.teacherId)?.name} · {scheduleLabel(g)}</small></span></label>)}{!shown.length&&<p className="group-helper">{groups.length?"Группы не найдены. Измените запрос.":"В этом филиале пока нет групп. Их можно создать в разделе «Группы и занятия», после сохранения учителя."}</p>}</div>
 </fieldset>;
}
