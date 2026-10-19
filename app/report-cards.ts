import {ShareReport} from "@/lib/share-report";
import {num} from "@/lib/analytics";
type CardPage={url:string;file:File};
type Block={title:string;lines:string[];y:number;height:number};
export async function cardPages(report:ShareReport):Promise<CardPage[]>{
 await document.fonts?.ready;
 const measure=document.createElement("canvas").getContext("2d");if(!measure)throw new Error("Не удалось подготовить карточку.");
 const font=(size:number,bold=false)=>`${bold?"600 ":""}${size}px "Segoe UI", Arial, sans-serif`;
 function wrap(text:string,width=856,size=25,bold=false){measure!.font=font(size,bold);const result:string[]=[];for(const paragraph of text.split("\n")){let line="";for(const word of paragraph.split(/\s+/)){if(measure!.measureText((line+" "+word).trim()).width>width&&line){result.push(line);line=""}if(measure!.measureText(word).width>width){for(const char of word){if(measure!.measureText(line+char).width>width){result.push(line);line=""}line+=char}}else line=(line+" "+word).trim()}result.push(line)}return result}
 const logo=await new Promise<HTMLImageElement|null>(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=new URL("logo-white.svg",document.baseURI).href});
 const p=report.presentation??{facts:[],metrics:[],totals:[],entries:[{title:"ОТЧЁТ",lines:report.lines}],section:"ИСТОРИЯ",threshold:7};
 const title=wrap(report.title,928,39,true),headerEnd=219+title.length*49;
 const allFacts=p.facts.flatMap(f=>wrap(f,856,23)),facts=allFacts.slice(0,6),factHeight=facts.length?facts.length*30+42:0;
 const metricRows=Math.ceil(p.metrics.length/2),metricTop=headerEnd+36+factHeight+34,metricEnd=p.metrics.length?metricTop+metricRows*121:headerEnd+30+factHeight;
 const totals=p.totals.flatMap(t=>wrap(t,880,24,true)),summaryEnd=metricEnd+(totals.length?totals.length*31+28:0)+35;
 const specs:{first:boolean;blocks:Block[];sectionY:number}[]=[{first:true,blocks:[],sectionY:Math.min(1260,summaryEnd)}];
 let y=summaryEnd+45;
 const entries=[...(allFacts.length>6?[{title:"Данные карточки · продолжение",lines:allFacts.slice(6)}]:[]),...p.entries];
 if(!entries.length)entries.push({title:"За выбранный период записей нет",lines:["Выберите другой период, чтобы увидеть результаты занятий."]});
 const nextPage=()=>{specs.push({first:false,blocks:[],sectionY:headerEnd+35});y=headerEnd+80};
 for(const entry of entries){let remaining=entry.lines.flatMap(l=>wrap(l)),continued=false;
  while(remaining.length){let titleLines=wrap(entry.title+(continued?" · продолжение":""),856,26,true);const headHeight=titleLines.length*32+28;
   const ideal=headHeight+remaining.length*30+24;
   if(y+ideal>1286&&ideal<1286-(headerEnd+80))nextPage();
   let capacity=Math.floor((1286-y-headHeight-24)/30);
   if(capacity<1){nextPage();capacity=Math.floor((1286-y-headHeight-24)/30)}
   const part=remaining.splice(0,capacity),height=headHeight+part.length*30+24;
   specs[specs.length-1].blocks.push({title:entry.title+(continued?" · продолжение":""),lines:part,y,height});y+=height+18;continued=true;if(remaining.length)nextPage();
  }
 }
 const pages:CardPage[]=[];
 for(const [index,spec] of specs.entries()){
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Не удалось нарисовать карточку.");
  const text=(s:string,x:number,y:number,size=25,color="#24465f",bold=false)=>{ctx.font=font(size,bold);ctx.fillStyle=color;ctx.fillText(s,x,y)};
  const box=(x:number,y:number,w:number,h:number,color:string,r=18)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()};
  ctx.fillStyle="#edf2f6";ctx.fillRect(0,0,1080,1440);box(28,28,1024,1384,"#ffffff",30);
  const gradient=ctx.createLinearGradient(28,28,1052,headerEnd);gradient.addColorStop(0,"#053b65");gradient.addColorStop(1,"#05283e");box(28,28,1024,headerEnd-28,gradient as unknown as string,28);
  ctx.save();ctx.beginPath();ctx.roundRect(28,28,1024,headerEnd-28,28);ctx.clip();for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(1035,36,170+i*64,0,Math.PI*2);ctx.strokeStyle="#e3c08b20";ctx.lineWidth=1;ctx.stroke()}ctx.restore();
  if(logo){const ratio=logo.naturalWidth/logo.naturalHeight;ctx.drawImage(logo,76,65,90*ratio,90)}
  text("SHARIFA",185,101,32,"#ffffff",true);text("ШКОЛА КОРАНА",185,139,17,"#c1d5df");
  box(76,177,54,4,"#ddbd83",2);text(report.subtitle,146,186,20,"#dcc597");
  title.forEach((s,i)=>text(s,76,238+i*49,39,"#ffffff",true));
  if(spec.first){
   let start=headerEnd+24;
   if(facts.length){box(62,start,956,factHeight,"#f5f8fb",16);facts.forEach((s,i)=>text(s,86,start+35+i*30,23,"#526d81"));start+=factHeight+34}
   if(p.metrics.length){text("СРЕДНИЕ ОЦЕНКИ ЗА ПЕРИОД",76,metricTop-12,17,"#5d768b",true);p.metrics.forEach((m,i)=>{const x=62+(i%2)*486,yy=metricTop+Math.floor(i/2)*121,low=m.value!==null&&m.value<p.threshold;box(x,yy,470,106,low?"#fff8ed":"#f1f7fb",15);text(m.label,x+20,yy+29,20,low?"#8b632b":"#456d88",true);text(num(m.value),x+20,yy+77,43,low?"#956223":"#075484",true);text("/ 10",x+115,yy+75,18,"#6b8294");box(x+202,yy+64,242,6,low?"#ece0ca":"#d9e8f2",3);if(m.value!==null)box(x+202,yy+64,Math.max(1,242*m.value/10),6,low?"#c09a55":"#478eb7",3)})}
   totals.forEach((s,i)=>text(s,78,metricEnd+30+i*31,24,"#295d7e",true));
  }
  if(spec.sectionY<1275&&spec.blocks.length){text(p.section,76,spec.sectionY+10,17,"#5d768b",true);ctx.strokeStyle="#dce7ef";ctx.beginPath();ctx.moveTo(76,spec.sectionY+22);ctx.lineTo(1004,spec.sectionY+22);ctx.stroke()}
  for(const block of spec.blocks){box(62,block.y,956,block.height,"#f8fafc",16);box(62,block.y+14,4,block.height-28,"#c7ad7c",2);let yy=block.y+34;const heading=wrap(block.title,856,26,true);heading.forEach(s=>{text(s,88,yy,26,"#164d74",true);yy+=32});yy+=3;block.lines.forEach(s=>{text(s,88,yy,25,s.startsWith("Джуз ")?"#36745f":s.startsWith("Комментарий:")?"#637b8d":"#3a5f79");yy+=30})}
  ctx.strokeStyle="#e1e9ef";ctx.beginPath();ctx.moveTo(76,1337);ctx.lineTo(1004,1337);ctx.stroke();text("SHARIFA  ·  УЧИТЬСЯ. ПОНИМАТЬ. РАСТИ.",76,1374,16,"#6b8294",true);text(`${index+1} / ${specs.length}`,920,1374,19,"#5d768b");
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Не удалось создать PNG")),"image/png"));
  pages.push({url:URL.createObjectURL(blob),file:new File([blob],`${report.filename}-${index+1}.png`,{type:"image/png"})});
 }
 return pages;
}
