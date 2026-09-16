'use client';
import { useEffect, useRef, useState } from 'react';

type F={id:string;name:string;size:number;mime_type:string;kind?:string;external_url?:string};
type R={id:string;section_id?:string;item:string;project_need:string;owner:string;progress:string;status:string;start_date:string|null;due_date:string|null;files:F[]};
type S={id:string;name:string;rows:R[];page_id?:string};
type P={id:string;name:string;pages:{id:string;title:string;sections:S[]}[]};
const defaultStatuses=['持續進行中','月初及月底','已完成','暫時結案','待確認'];
// 分類顏色只存在前端，不寫入 Supabase。
// 以分類在工作區中的順序決定顏色，因此每個工作區：
// 第 1 個分類永遠同色、第 2 個分類永遠同色，以此類推。
const sectionColors=[
  {bg:'#eef6ff',head:'#e6f0ff',border:'#6aa9e9'},
  {bg:'#eefaf1',head:'#e4f6e9',border:'#62b879'},
  {bg:'#f7efff',head:'#f1e4ff',border:'#9b6bd3'},
  {bg:'#fff5e8',head:'#ffecd1',border:'#e2a04a'},
  {bg:'#fff0f2',head:'#ffe1e6',border:'#d9798a'},
  {bg:'#eefaf8',head:'#e0f5f1',border:'#54a99a'},
  {bg:'#f4f1ff',head:'#eae5ff',border:'#7f72c7'},
  {bg:'#f8f5ed',head:'#f1ead9',border:'#a88d52'}
];
const size=(n:number)=>n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
async function json(url:string,opts?:RequestInit){const r=await fetch(url,opts);const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'操作失敗');return x}

export default function Home(){
 const[projects,setProjects]=useState<any[]>([]),[pid,setPid]=useState(''),[d,setD]=useState<P|null>(null),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[toast,setToast]=useState(''),[statusMap,setStatusMap]=useState<Record<string,string[]>>({}),[showStatusSettings,setShowStatusSettings]=useState(false),[newStatus,setNewStatus]=useState('');
 const cache=useRef<Record<string,P>>({});
 const[dragRowId,setDragRowId]=useState<string>('');
 const[dragOverSection,setDragOverSection]=useState<string>('');
 const cacheKey=(id:string)=>`notion-cloud-cache-${id}`;
 const statusKey=(id:string)=>`notion-cloud-statuses-${id}`;
 const getStatuses=(id=pid)=>statusMap[id]||defaultStatuses;
 const saveCache=(x:P)=>{cache.current[x.id]=x;try{localStorage.setItem(cacheKey(x.id),JSON.stringify(x))}catch{}};
 const loadCached=(id:string)=>{if(cache.current[id])return cache.current[id];try{const x=JSON.parse(localStorage.getItem(cacheKey(id))||'null');if(x){cache.current[id]=x;return x}}catch{}return null};
 const loadStatuses=(id:string)=>{try{const x=JSON.parse(localStorage.getItem(statusKey(id))||'null');if(Array.isArray(x)&&x.length)return x.filter((v:any)=>typeof v==='string'&&v.trim())}catch{}return defaultStatuses};
 const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({});
 const flash=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),1800)};
 const reloadProjects=async()=>{const x=await json('/api/projects');setProjects(x);setPid(cur=>cur&&x.some((p:any)=>p.id===cur)?cur:(x[0]?.id||''));};
 const reload=async(id=pid,background=false)=>{if(!id){setD(null);return}const cached=loadCached(id);if(cached){setD(cached);if(!background)return;}const x=await json('/api/projects/'+id);saveCache(x);setD(x);};
 useEffect(()=>{reloadProjects().catch(e=>alert(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(!pid){setD(null);setLoading(false);return}setLoading(false);setStatusMap(m=>({...m,[pid]:loadStatuses(pid)}));const cached=loadCached(pid);if(cached)setD(cached);reload(pid,true).catch(()=>{});},[pid]);
 const saveLater=(key:string,body:any)=>{clearTimeout(timers.current[key]);timers.current[key]=setTimeout(async()=>{try{const x=cache.current[pid]||d;if(x)saveCache(x);await json(`/api/projects/${pid}/data`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}catch(e:any){console.error(e)}},650)};
 const updateLocalRow=(rowId:string,patch:any)=>setD(cur=>cur?{...cur,pages:cur.pages.map(pg=>({...pg,sections:pg.sections.map(s=>({...s,rows:s.rows.map(r=>r.id===rowId?{...r,...patch}:r)}))}))}:cur);
 const updateLocalSection=(id:string,name:string)=>setD(cur=>cur?{...cur,pages:cur.pages.map(pg=>({...pg,sections:pg.sections.map(s=>s.id===id?{...s,name}:s)}))}:cur);
 const mutateImmediate=async(body:any)=>{setBusy(true);try{await json(`/api/projects/${pid}/data`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});await reload(pid,false)}catch(e:any){alert(e.message)}finally{setBusy(false)}};
 const addStatus=()=>{const name=newStatus.trim();if(!name)return;const next=[...getStatuses(),name];setStatusMap(m=>({...m,[pid]:next}));localStorage.setItem(statusKey(pid),JSON.stringify(next));setNewStatus('');};
 const removeStatus=(name:string)=>{const cur=getStatuses();if(cur.length<=1){alert('至少保留一個狀態');return}const next=cur.filter(x=>x!==name);setStatusMap(m=>({...m,[pid]:next}));localStorage.setItem(statusKey(pid),JSON.stringify(next));const used=(d?.pages||[]).flatMap(pg=>pg.sections).flatMap(s=>s.rows).filter(r=>r.status===name);used.forEach(r=>{updateLocalRow(r.id,{status:next[0]});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:r.project_need,owner:r.owner,progress:r.progress,status:next[0],start_date:r.start_date,due_date:r.due_date})})};
 const newProject=async()=>{const name=prompt('工作區名稱');if(!name?.trim())return;setBusy(true);try{const x=await json('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});await reloadProjects();setPid(x.id)}catch(e:any){alert(e.message)}finally{setBusy(false)}};
 const deleteProject=async()=>{if(!d)return;if(!confirm(`確定要刪除「${d.name}」嗎？\n所有雲端附件也會一起刪除。`))return;setBusy(true);try{await json('/api/projects/'+d.id,{method:'DELETE'});delete cache.current[d.id];try{localStorage.removeItem(cacheKey(d.id));localStorage.removeItem(statusKey(d.id))}catch{};setD(null);setPid('');await reloadProjects()}catch(e:any){alert(e.message)}finally{setBusy(false)}};
 const addSection=async()=>{const first=d?.pages?.[0];if(!first)return;await mutateImmediate({action:'createSection',pageId:first.id});};
 const addRow=async(s:S)=>mutateImmediate({action:'createRow',sectionId:s.id});
 const delSection=(id:string)=>confirm('刪除這個分類？其中事項與附件也會刪除。')&&mutateImmediate({action:'deleteSection',id});
 const delRow=(id:string)=>confirm('刪除這個事項？其附件也會刪除。')&&mutateImmediate({action:'deleteRow',id});
 const moveRow=async(rowId:string,targetSectionId:string)=>{
   if(!pid||!targetSectionId)return;
   const target=d?.pages.flatMap(pg=>pg.sections).find(s=>s.id===targetSectionId);
   const row=d?.pages.flatMap(pg=>pg.sections).flatMap(s=>s.rows).find(r=>r.id===rowId);
   if(!target||!row)return;
   // 先立即更新畫面，再背景同步，避免拖曳後卡住。
   setD(cur=>cur?{...cur,pages:cur.pages.map(pg=>({...pg,sections:pg.sections.map(sec=>{
     if(sec.id===row.section_id)return {...sec,rows:sec.rows.filter(x=>x.id!==rowId)};
     if(sec.id===targetSectionId)return {...sec,rows:[...sec.rows,{...row}]};
     return sec;
   })}))}:cur);
   try{
     await json(`/api/projects/${pid}/data`,{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({action:'moveRow',id:rowId,targetSectionId,sortOrder:target.rows.length})
     });
     if(cache.current[pid]) cache.current[pid]=d as P;
     flash('事項已移到新分類');
   }catch(e:any){
     alert(e.message);
     await reload(pid,false);
   }
 };
 const upload=async(row:R,files:FileList|null)=>{if(!files)return;setBusy(true);try{for(const f of Array.from(files)){const form=new FormData();form.append('rowId',row.id);form.append('file',f);await json(`/api/projects/${pid}/files`,{method:'POST',body:form})}await reload(pid);flash('檔案已上傳到 Supabase');}catch(e:any){alert(e.message)}finally{setBusy(false)}};
 const addLink=async(row:R)=>{const url=prompt('貼上網址');if(!url)return;try{await json(`/api/projects/${pid}/files`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rowId:row.id,url,name:url})});await reload(pid);flash('連結已新增')}catch(e:any){alert(e.message)}};
 const delFile=async(f:F)=>{if(!confirm(`刪除「${f.name}」？\n雲端檔案與資料庫紀錄會一起刪除。`))return;setBusy(true);try{await json(`/api/projects/${pid}/files/delete`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileId:f.id})});await reload(pid)}catch(e:any){alert(e.message)}finally{setBusy(false)}};
 const share=async()=>{try{const x=await json(`/api/projects/${pid}/share`,{method:'POST'});await navigator.clipboard.writeText(x.url);flash('分享網址已複製')}catch(e:any){alert(e.message)}};
 const visible=(r:R,s:S)=>`${s.name} ${r.item} ${r.project_need} ${r.owner} ${r.progress} ${r.status}`.toLowerCase().includes(q.toLowerCase());
 if(loading)return <div className="center">☁️ 雲端資料載入中…</div>;
 const sections=d?.pages.flatMap(pg=>pg.sections)||[];
 const statuses=getStatuses();
 return <main className="app"><aside className="side"><h2>◆ Notion Cloud</h2><button className="primary" onClick={newProject} disabled={busy}>＋ 新增工作區</button><div className="label">工作區</div>{projects.map(p=><div className={'workspace '+(p.id===pid?'active':'')} key={p.id}><button onClick={()=>setPid(p.id)}>📋 {p.name}</button><button className="trash" title="刪除工作區" onClick={()=>{setPid(p.id);setTimeout(()=>deleteProject(),0)}}>🗑</button></div>)}{!projects.length&&<div className="muted">尚未建立工作區</div>}</aside><section className="main"><header><div><b>{d?.name||'雲端工作區'}</b>{d&&<button className="danger small" onClick={deleteProject} disabled={busy}>刪除工作區</button>}</div><div className="tools"><button onClick={()=>setShowStatusSettings(v=>!v)}>⚙ 狀態</button><input placeholder="搜尋事項…" value={q} onChange={e=>setQ(e.target.value)}/>{d&&<button onClick={share}>🔗 分享</button>}</div></header>{showStatusSettings&&d&&<div className="statusPanel"><div className="rowBetween"><b>狀態設定（只存在此瀏覽器，不同步雲端）</b><button onClick={()=>setShowStatusSettings(false)}>關閉</button></div><div className="statusList">{statuses.map((st,i)=><div className="statusItem" key={st}><span>{i+1}. {st}</span><button className="danger small" onClick={()=>removeStatus(st)}>刪除</button></div>)}</div><div className="addStatus"><input value={newStatus} onChange={e=>setNewStatus(e.target.value)} placeholder="新增狀態" onKeyDown={e=>{if(e.key==='Enter')addStatus()}}/><button onClick={addStatus}>＋ 新增</button></div></div>}{!d?<div className="empty"><h1>建立你的第一個工作區</h1><p>附件實體檔案會同步到 Supabase Storage；文字資料只在變更時同步，不再每打一個字就重新載入整頁。</p><button className="primary" onClick={newProject}>＋ 建立工作區</button></div>:<article><div className="head"><div><h1 className="titleText">工作區</h1><p>☁️ 附件雲端同步 · 編輯採延遲儲存，減少卡頓</p></div><button onClick={addSection} disabled={busy}>＋ 新分類</button></div>{sections.map((s,i)=><section className={`card ${dragOverSection===s.id?'dragTarget':''}`} key={s.id}
 onDragOver={e=>{if(dragRowId){e.preventDefault();setDragOverSection(s.id)}}}
 onDragLeave={()=>setDragOverSection(v=>v===s.id?'':v)}
 onDrop={e=>{e.preventDefault();if(dragRowId&&dragRowId){moveRow(dragRowId,s.id)}setDragRowId('');setDragOverSection('')}}
 style={{borderLeft:`4px solid ${sectionColors[i % sectionColors.length].border}`,background:sectionColors[i % sectionColors.length].bg}}><div className="sect" style={{background:sectionColors[i % sectionColors.length].head}}><input value={s.name} onChange={e=>{updateLocalSection(s.id,e.target.value);saveLater('section-'+s.id,{action:'updateSection',id:s.id,name:e.target.value})}}/><div><button onClick={()=>addRow(s)} disabled={busy}>＋ 新事項</button><button className="danger small" onClick={()=>delSection(s.id)} disabled={busy}>刪除分類</button></div></div><div className="scroll"><table><thead><tr><th>事項</th><th>專案需求</th><th>擔當者</th><th>目前執行狀況</th><th>狀態</th><th>開案日期</th><th>限期日期</th><th>附件 / 連結</th><th></th></tr></thead><tbody>{s.rows.filter(r=>visible(r,s)).map(r=><tr key={r.id}
 draggable
 onDragStart={()=>setDragRowId(r.id)}
 onDragEnd={()=>{setDragRowId('');setDragOverSection('')}}
 className={dragRowId===r.id?'dragging':''}><td><input value={r.item} onChange={e=>{updateLocalRow(r.id,{item:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:e.target.value,project_need:r.project_need,owner:r.owner,progress:r.progress,status:r.status,start_date:r.start_date,due_date:r.due_date})}}/></td><td><textarea value={r.project_need||''} onChange={e=>{updateLocalRow(r.id,{project_need:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:e.target.value,owner:r.owner,progress:r.progress,status:r.status,start_date:r.start_date,due_date:r.due_date})}}/></td><td><input value={r.owner||''} onChange={e=>{updateLocalRow(r.id,{owner:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:r.project_need,owner:e.target.value,progress:r.progress,status:r.status,start_date:r.start_date,due_date:r.due_date})}}/></td><td><textarea value={r.progress||''} onChange={e=>{updateLocalRow(r.id,{progress:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:r.project_need,owner:r.owner,progress:e.target.value,status:r.status,start_date:r.start_date,due_date:r.due_date})}}/></td><td><select value={r.status} onChange={e=>{updateLocalRow(r.id,{status:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:r.project_need,owner:r.owner,progress:r.progress,status:e.target.value,start_date:r.start_date,due_date:r.due_date})}}>{statuses.map(x=><option key={x}>{x}</option>)}</select></td><td><input type="date" value={r.start_date||''} onChange={e=>{updateLocalRow(r.id,{start_date:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:r.project_need,owner:r.owner,progress:r.progress,status:r.status,start_date:e.target.value,due_date:r.due_date})}}/></td><td><input type="date" value={r.due_date||''} onChange={e=>{updateLocalRow(r.id,{due_date:e.target.value});saveLater('row-'+r.id,{action:'updateRow',id:r.id,item:r.item,project_need:r.project_need,owner:r.owner,progress:r.progress,status:r.status,start_date:r.start_date,due_date:e.target.value})}}/></td><td><div className="files">{r.files?.map(f=><div className="file" key={f.id}><span>{f.kind==='link'?'🔗':'📎'}</span><span className="fname" title={f.name}>{f.name}{f.size?` · ${size(f.size)}`:''}</span><a href={`/api/files/${f.id}?mode=open`} target="_blank">開啟</a>{f.kind!=='link'&&<a href={`/api/files/${f.id}?mode=download`}>下載</a>}<button onClick={()=>delFile(f)} disabled={busy}>刪除</button></div>)}<div className="attachBtns"><label>＋ 上傳<input type="file" multiple onChange={e=>{upload(r,e.target.files);e.currentTarget.value=''}}/></label><button onClick={()=>addLink(r)} disabled={busy}>🔗 加連結</button></div></div></td><td>
 <div className="rowActions">
  <select className="moveSelect" value="" onChange={e=>{const v=e.target.value;if(v){moveRow(r.id,v);e.currentTarget.value=''}}}>
   <option value="">移動到…</option>
   {sections.filter(x=>x.id!==s.id).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
  </select>
  <button className="danger small" onClick={()=>delRow(r.id)} disabled={busy}>刪除</button>
 </div>
</td></tr>)}</tbody></table></div></section>)}</article>}{toast&&<div className="toast">{toast}</div>}</section></main>
}
