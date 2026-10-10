import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";
const file=(name:string)=>fileURLToPath(new URL(name,import.meta.url));
export default defineConfig({
 root:file("./preview"),
 base:process.env.PAGES_BASE_PATH??"/sharifa-preview/",
 publicDir:file("./public"),
 plugins:[react()],
 resolve:{alias:[
  {find:"@/lib/storage",replacement:file("./preview/browser-storage.ts")},
  {find:"@/lib/backup-storage",replacement:file("./preview/browser-storage.ts")},
  {find:"@/app/chatgpt-auth",replacement:file("./preview/browser-auth.ts")},
  {find:"@",replacement:file("./")},
 ]},
 css:{postcss:file("./")},
 build:{outDir:file("./dist-pages"),emptyOutDir:true},
});
