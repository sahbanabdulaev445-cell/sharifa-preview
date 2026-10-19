export const WHATSAPP_WEB="https://web.whatsapp.com/";
export function whatsAppTextUrl(text:string,mobile=false){return `${mobile?"https://wa.me/?text=":"https://web.whatsapp.com/send?text="}${encodeURIComponent(text)}`}
export async function copyPngToClipboard(file:Blob){
 if(file.type!=="image/png")throw new Error("Карточка должна быть в формате PNG.");
 if(!navigator.clipboard?.write||typeof ClipboardItem==="undefined")throw new Error("Браузер не поддерживает копирование PNG. Скачайте карточку и прикрепите её в WhatsApp Web через «+» → «Фото и видео».");
 await navigator.clipboard.write([new ClipboardItem({"image/png":file})]);
}
