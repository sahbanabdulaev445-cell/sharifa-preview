type Transport=(url:string,init?:RequestInit)=>Promise<Response>;
let previewTransport:Transport|undefined;

// Installed only by the standalone GitHub Pages entry point.
export function configurePreviewTransport(transport:Transport){previewTransport=transport}
export async function appRequest(url:string,init?:RequestInit){
 if(init?.signal?.aborted)throw new DOMException("Запрос отменён","AbortError");
 const response=await (previewTransport?previewTransport(url,init):fetch(url,init));
 if(init?.signal?.aborted)throw new DOMException("Запрос отменён","AbortError");
 return response;
}
