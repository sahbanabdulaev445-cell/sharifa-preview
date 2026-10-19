import assert from "node:assert/strict";
import {createServer} from "vite";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {fileURLToPath} from "node:url";

// Render dialog contents in SSR so field routing and actions can be inspected.
const server=await createServer({configFile:"vite.pages.config.ts",server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},plugins:[{name:"test-inline-dialog",enforce:"pre",load(id){if(id.replaceAll("\\","/").endsWith("/components/ui/dialog.tsx"))return `import React from 'react';const Part=({children})=>React.createElement('div',null,children);export const Dialog=Part,DialogContent=Part,DialogDescription=Part,DialogHeader=Part,DialogTitle=Part;`}}]});
try{
 const load=p=>server.ssrLoadModule(fileURLToPath(new URL(`../${p}`,import.meta.url)));
 const model=await load("lib/analytics.ts"),{default:Editor}=await load("app/editor.tsx"),{default:History}=await load("app/check-history.tsx"),{default:Bulk}=await load("app/people-bulk-tools.tsx"),{default:Share}=await load("app/share-report.tsx"),whatsapp=await load("lib/whatsapp.ts"),reports=await load("lib/share-report.ts");
 const data=structuredClone(model.emptyData),branch=model.branchNames(data)[0];
 const teacher={id:"t",name:"Учитель",kind:"teacher",branch,gender:"male",groups:"Нур"};
 const pupil={id:"p",name:"Ученик",kind:"student",branch,gender:"male",level:"Начальный",teacherId:"t",groupId:"g",groups:"Нур",birthYear:2018};
 const group={id:"g",name:"Нур",teacherId:"t",branch,gender:"male",days:[0],startTime:"09:00",endTime:"10:00"};
 data.people=[teacher,pupil];data.groups=[group];
 const props={data,onSave:async()=>{},onClose:()=>{}};
 const html=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
 const beginner=html(Editor,{...props,editing:{kind:"check",value:{personId:pupil.id,assessmentType:"reading",groupId:"g",teacherId:"t"}}});
 for(const label of ["Буквы","Правила таджвида","Чтение","Посещаемость"])assert.ok(beginner.includes(label));
 for(const label of ["Махрадж","Пройденный материал","Хифз"])assert.ok(!beginner.includes(label),label);
 for(const key of ["letters","rules","reading","attendance"])assert.match(beginner,new RegExp(`id="beginner-${key}"`));
 assert.match(beginner,/Сохранить и другой урок/);
 const old={id:"old",personId:"p",date:"2026-10-01",makhraj:8,tajweed:7,hifz:6,attendance:9,note:""};
 const historical=html(Editor,{...props,editing:{kind:"check",value:old}});
 assert.ok(historical.includes("Махрадж"));assert.ok(!historical.includes('id="beginner-letters"'));
 for(const level of ["Чтение","Хифз","Средний","Продвинутый"]){data.people[1]={...pupil,level};const reading=html(Editor,{...props,editing:{kind:"check",value:{personId:"p",assessmentType:"reading",groupId:"g",teacherId:"t"}}});for(const label of ["Махрадж","Таджвид","Хифз","Посещаемость","Пройденный материал"])assert.ok(reading.includes(label),`${level}: ${label}`);}
 data.people[1]=pupil;
 const check={id:"c",personId:"p",date:"2026-10-01",assessmentType:"beginner",letters:8,rules:7,reading:6,attendance:9,note:"Повторить буквы"};data.checks=[check];
 const history=html(History,{data,checks:data.checks,period:"all",onEdit:()=>{}});
 for(const label of ["Буквы","Правила таджвида","Чтение","Посещаемость","Повторить буквы"])assert.ok(history.includes(label));
 const bulk=html(Bulk,{data,kind:"student",archived:false,onArchivedChange:()=>{},selected:[pupil],onSelectAll:()=>{},onClear:()=>{},total:1,activeCount:1,archivedCount:0,onSave:async()=>{},onDone:()=>{}});
 for(const label of ["Выбрать всех найденных","Удалить","выбранных","Удалённые"])assert.ok(bulk.includes(label));
 const restored=html(Bulk,{data,kind:"teacher",archived:true,onArchivedChange:()=>{},selected:[teacher],onSelectAll:()=>{},onClear:()=>{},total:1,activeCount:0,archivedCount:1,onSave:async()=>{},onDone:()=>{}});assert.ok(restored.includes("Восстановить"));
 const share=html(Share,{report:reports.studentReport(data,pupil,"all"),onClose:()=>{}});for(const label of ["Карточку в WhatsApp Web","Скопировать изображение","Через меню телефона","Ctrl+V"])assert.ok(share.includes(label));assert.ok(share.includes('href="https://web.whatsapp.com/"'));
 const text="Шарифа & оценки\n8 / 10";assert.equal(whatsapp.whatsAppTextUrl(text),`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`);assert.equal(whatsapp.whatsAppTextUrl(text,true),`https://wa.me/?text=${encodeURIComponent(text)}`);
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,"navigator"),oldItem=globalThis.ClipboardItem;let written;
 try{
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{clipboard:{write:async items=>{written=items}}}});
  globalThis.ClipboardItem=class{constructor(data){this.data=data}};
  const png=new Blob([new Uint8Array([137,80,78,71])],{type:"image/png"});await whatsapp.copyPngToClipboard(png);assert.equal(written.length,1);assert.equal(written[0].data["image/png"],png);assert.deepEqual(Object.keys(written[0].data),["image/png"]);
  await assert.rejects(()=>whatsapp.copyPngToClipboard(new Blob(["text"],{type:"text/plain"})),/PNG/);
  navigator.clipboard.write=async()=>{throw new Error("Permission denied")};await assert.rejects(()=>whatsapp.copyPngToClipboard(png),/Permission denied/);
  delete navigator.clipboard;await assert.rejects(()=>whatsapp.copyPngToClipboard(png),/не поддерживает/);
 }finally{if(oldNavigator)Object.defineProperty(globalThis,"navigator",oldNavigator);else delete globalThis.navigator;if(oldItem)globalThis.ClipboardItem=oldItem;else delete globalThis.ClipboardItem;}
 console.log("PASS: beginner/legacy/Quran form routing, four beginner fields, history, bulk actions, WhatsApp Web image and text controls, PNG clipboard payload and failure paths.");
}finally{await server.close()}
