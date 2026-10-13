import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import Dashboard from "../app/dashboard";
import {configurePreviewTransport} from "../lib/client-request";
import * as data from "../app/api/data/route";
import * as backup from "../app/api/backup/route";
import "../app/globals.css";
import "./preview.css";

configurePreviewTransport(async (url,init)=>{
 const headers=new Headers(init?.headers);headers.set("Origin",location.origin);
 const req=new Request(new URL(url,location.origin),{...init,headers});
 if(req.url.includes("/api/data"))return req.method==="POST"?data.POST(req):data.GET(req);
 if(req.url.endsWith("/api/backup"))return req.method==="POST"?backup.POST(req):backup.GET();
 return Response.json({error:"Страница не найдена"},{status:404});
});

createRoot(document.getElementById("root")!).render(<StrictMode><Dashboard/></StrictMode>);
