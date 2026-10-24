"use client";
import {useState} from "react";
import {Pencil,Trash2,RotateCcw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Data,Group} from "@/lib/analytics";
import {groupStudents} from "@/lib/groups";
export default function GroupActions({data,group,onEdit,onSave,onDeleted}:{data:Data;group:Group;onEdit:()=>void;onSave:(kind:string,value:unknown)=>Promise<void>;onDeleted?:()=>void}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function act(){setBusy(true);setError("");try{await onSave("group-action",{id:group.id,action:group.archived?"restore":"archive"});setConfirm(false);onDeleted?.()}catch(e){setError(e instanceof Error?e.message:"Не удалось изменить группу")}finally{setBusy(false)}}
 return <><div className="group-management-actions">{group.archived?<Button variant="outline" disabled={busy} onClick={()=>void act()}><RotateCcw size={15}/>Восстановить</Button>:<><Button variant="outline" onClick={onEdit}><Pencil size={15}/>Редактировать</Button><Button variant="ghost" className="group-danger" onClick={()=>setConfirm(true)}><Trash2 size={15}/>Удалить</Button></>}</div>{error&&!confirm&&<p role="alert" className="form-error">{error}</p>}{confirm&&<Dialog open onOpenChange={open=>{if(!busy)setConfirm(open)}}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>Удалить группу «{group.name}»?</DialogTitle><DialogDescription>Группа исчезнет из расписания и действующих списков. Карточки учеников, их учитель и все оценки сохранятся.</DialogDescription></DialogHeader><p className="group-delete-summary">Ученики в группе: <b>{groupStudents(data,group).length}</b>. После удаления они останутся у своих учителей без группы. Восстановить группу можно в окне филиала, во вкладке «Группы → Удалённые». Состав при восстановлении назначается заново.</p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-footer"><Button variant="outline" disabled={busy} onClick={()=>setConfirm(false)}>Отмена</Button><Button variant="destructive" disabled={busy} onClick={()=>void act()}>{busy?"Удаляем…":"Удалить группу"}</Button></div></DialogContent></Dialog>}</>;
}
