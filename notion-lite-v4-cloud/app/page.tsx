'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type F={id:string;name:string;size:number;mime_type:string;kind?:string;external_url?:string}
type R={id:string;section_id:string;item:string;project_need:string;owner:string;progress:string;status:string;start_date:string|null;due_date:string|null;files:F[]}
type S={id:string;name:string;rows:R[]}
type P={id:string;name:string;pages:{id:string;title:string;sections:S[]}[]}

const defaultStatuses=['持續進行中','月初及月底','已完成','暫時結案','待確認']
const sectionColors=[['#eaf2ff','#4b74c8'],['#eaf8ee','#3d8b5d'],['#f3edff','#7657b5'],['#fff2e5','#b36a24'],['#eaf8f8','#2d8585'],['#fff0f3','#b34d68']]
const statusColors=['#e8f1ff','#eaf8ee','#fff4df','#f3edff','#ffecef','#eaf8f8','#f1f3f5','#fff0e5']
const statusColor=(name:string)=>{let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return statusColors[h%statusColors.length]}
const size=(n:number)=>n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`
async function json(url:string,opts?:RequestInit){const r=await fetch(url,opts);const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'操作失敗');return x}

export default function Home(){
 const[projects,setProjects]=useState<any[]>([]),[pid,setPid]=useState(''),[d,setD]=useState<P|null>(null),[q,setQ]=useState(''),[initialLoading,setInitialLoading]=useState(true),[busy,setBusy]=useState<Record<string,boolean>>({}),[toast,setToast]=useState('')
 const cache=useRef<Record<string,P>>({}); const requestNo=useRef(0); const mounted=useRef(true)
 const [statuses,setStatuses]=useState<string[]>(()=>{try{const x=localStorage.getItem('nc-statuses');return x?JSON.parse(x):defaultStatuses}catch{return defaultStatuses}})
 const [drag,setDrag]=useState<string>(''); const [drop,setDrop]=useState<string>('')
 const columnDefs=[['item','事項'],['project_need','專案需求'],['owner','擔當者'],['progress','目前執行狀況'],['status','狀態'],['start_date','開案日期'],['due_date','限期日期'],['files','附件 / 連結']] as const
 const [columnMenu,setColumnMenu]=useState<string>('')
 const [dragColumn,setDragColumn]=useState<{section:string;key:string}|null>(null)
 const moveColumn=(sid:string,from:string,to:string)=>{
   if(from===to)return
   setSectionColumns(prev=>{
     const cur=[...(prev[sid]||columnDefs.map(x=>x[0]))]
     const a=cur.indexOf(from),b=cur.indexOf(to)
     if(a<0||b<0)return prev
     cur.splice(a,1);cur.splice(b,0,from)
     return {...prev,[sid]:cur}
   })
 }
 const [sectionColumns,setSectionColumns]=useState<Record<string,string[]>>({})
 useEffect(()=>{try{const x=localStorage.getItem('nc-section-columns');if(x)setSectionColumns(JSON.parse(x))}catch{}},[])
 useEffect(()=>{localStorage.setItem('nc-section-columns',JSON.stringify(sectionColumns))},[sectionColumns])
 const visibleColumns=(sid:string)=>sectionColumns[sid]||columnDefs.map(x=>x[0])
 const toggleColumn=(sid:string,key:string)=>{
   setSectionColumns(prev=>{
     const cur=prev[sid]||columnDefs.map(x=>x[0])
     if(cur.includes(key)&&cur.length<=1){alert('至少保留一個欄位');return prev}
     return {...prev,[sid]:cur.includes(key)?cur.filter(x=>x!==key):[...cur,key]}
   })
 }
 useEffect(()=>()=>{mounted.current=false},[])
 useEffect(()=>{localStorage.setItem('nc-statuses',JSON.stringify(statuses))},[statuses])
 const mark=(k:string,v:boolean)=>setBusy(x=>({...x,[k]:v}))
 const flash=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),1800)}
 const reloadProjects=useCallback(async()=>{const x=await json('/api/projects');if(!mounted.current)return;setProjects(x);setPid(cur=>cur&&x.some((p:any)=>p.id===cur)?cur:(x[0]?.id||''))},[])
 const load=useCallback(async(id:string)=>{if(!id)return;const n=++requestNo.current;if(cache.current[id])setD(cache.current[id]);try{const x=await json('/api/projects/'+id);if(n!==requestNo.current)return;cache.current[id]=x;if(mounted.current)setD(x)}catch(e:any){if(n===requestNo.current)alert(e.message)}},[])
 useEffect(()=>{reloadProjects().catch(e=>alert(e.message)).finally(()=>setInitialLoading(false))},[reloadProjects])
 useEffect(()=>{if(pid)load(pid);else setD(null)},[pid,load])
 const sections=useMemo(()=>d?.pages?.flatMap(p=>p.sections)||[],[d])
 const mutate=async(body:any,optimistic:(x:P)=>P,key:string,success?:string,reconcile?:(x:P,res:any)=>P)=>{
   if(!pid)return; const before=d; mark(key,true); setD(cur=>cur?optimistic(cur):cur)
   try{
     const res=await json(`/api/projects/${pid}/data`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
     setD(cur=>{
       if(!cur)return cur
       const next=reconcile?reconcile(cur,res):cur
       cache.current[pid]=next
       return next
     })
     if(success)flash(success)
   }catch(e:any){if(before)setD(before);alert(e.message)}finally{mark(key,false)}
 }
 const ensureSectionPage=()=>d?.pages?.[0]?.id||''
 const newProject=async()=>{const name=prompt('工作區名稱');if(!name?.trim())return;try{const x=await json('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim()})});setProjects(p=>[...p,x]);setPid(x.id);flash('工作區已建立')}catch(e:any){alert(e.message)}}
 const deleteProject=async(id=pid)=>{const p=projects.find(x=>x.id===id);if(!p)return;if(!confirm(`確定刪除「${p.name}」？所有分類、事項與雲端附件都會刪除。`))return;mark('project:'+id,true);try{await json('/api/projects/'+id,{method:'DELETE'});delete cache.current[id];const next=projects.filter(x=>x.id!==id);setProjects(next);setPid(cur=>cur===id?(next[0]?.id||''):cur);flash('工作區已刪除')}catch(e:any){alert(e.message)}finally{mark('project:'+id,false)}}
 const addSection=()=>{
  const pageId=ensureSectionPage(); if(!pageId)return;
  const tempId='temp-section-'+Date.now();
  mutate({action:'createSection',pageId,name:'新分類',sortOrder:sections.length},cur=>({...cur,pages:cur.pages.map((p,i)=>i===0?{...p,sections:[...p.sections,{id:tempId,name:'新分類',rows:[]}]}:p)}),'add-section','分類已新增',(cur,res)=>({...cur,pages:cur.pages.map((p,i)=>i===0?{...p,sections:p.sections.map(sec=>sec.id===tempId?{...sec,id:res.id,project_id:res.project_id,page_id:res.page_id}:sec)}:p)}))
 }
 const delSection=(sid:string)=>{
  if(!confirm('刪除這個分類？其中事項與附件也會刪除。'))return;
  mutate({action:'deleteSection',id:sid},cur=>({...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.filter(sec=>sec.id!==sid)}))}),'del-section','分類已刪除');
 }
 const addRow=(sec:S)=>{
  const tempId='temp-row-'+Date.now();
  mutate({action:'createRow',sectionId:sec.id,sortOrder:sec.rows.length,status:statuses[0]||'待確認'},cur=>({...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(x=>x.id===sec.id?{...x,rows:[...x.rows,{id:tempId,section_id:sec.id,item:'新事項',project_need:'',owner:'',progress:'',status:statuses[0]||'待確認',start_date:null,due_date:null,files:[]}]}:x)}))}),'add-row:'+sec.id,'事項已新增',(cur,res)=>({...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(x=>({...x,rows:x.rows.map(r=>r.id===tempId?{...r,...res,id:res.id,section_id:res.section_id}:r)}))}))}))
 }
 const delRow=(rid:string,sid:string)=>{
  if(!confirm('刪除這個事項？其附件也會刪除。'))return;
  mutate({action:'deleteRow',id:rid},cur=>({...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(sec=>sec.id===sid?{...sec,rows:sec.rows.filter(r=>r.id!==rid)}:sec)}))}),'del-row:'+rid,'事項已刪除');
 }
 const updateRow=(r:R,patch:any)=>{
  mutate({action:'updateRow',id:r.id,...patch},cur=>({...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(sec=>({...sec,rows:sec.rows.map(z=>z.id===r.id?{...z,...patch}:z)}))}))}),'row:'+r.id);
 }
 const moveRow=(r:R,target:S)=>{
  if(r.section_id===target.id)return;
  const copy={...r,section_id:target.id};
  mutate({action:'moveRow',id:r.id,targetSectionId:target.id,sortOrder:target.rows.length},cur=>({...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(sec=>{
    if(sec.id===r.section_id)return {...sec,rows:sec.rows.filter(z=>z.id!==r.id)};
    if(sec.id===target.id)return {...sec,rows:[...sec.rows,copy]};
    return sec;
  })}))}),'move:'+r.id,'事項已移動');
 }
 const upload=async(row:R,files:FileList|null)=>{
  if(!files||!pid)return; const list=Array.from(files); mark('upload:'+row.id,true);
  try{
    for(const f of list){
      const form=new FormData(); form.append('rowId',row.id); form.append('file',f);
      const saved=await json(`/api/projects/${pid}/files`,{method:'POST',body:form});
      setD(cur=>cur?{...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(sec=>({...sec,rows:sec.rows.map(r=>r.id===row.id?{...r,files:[...(r.files||[]),saved]}:r)}))}))}:cur);
      flash(`${f.name} 上傳完成`);
    }
  }catch(e:any){alert(e.message||'上傳失敗')}finally{mark('upload:'+row.id,false)}
 }
 const addLink=async(row:R)=>{
  const url=prompt('貼上網址'); if(!url)return; mark('link:'+row.id,true);
  try{
    const saved=await json(`/api/projects/${pid}/files`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rowId:row.id,url,name:url})});
    setD(cur=>cur?{...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(sec=>({...sec,rows:sec.rows.map(r=>r.id===row.id?{...r,files:[...(r.files||[]),saved]}:r)}))}))}:cur);
    flash('連結已新增');
  }catch(e:any){alert(e.message||'連結新增失敗')}finally{mark('link:'+row.id,false)}
 }
 const delFile=async(f:F,row:R)=>{
  if(!confirm(`刪除「${f.name}」？`))return;
  const before=d;
  setD(cur=>cur?{...cur,pages:cur.pages.map(p=>({...p,sections:p.sections.map(sec=>({...sec,rows:sec.rows.map(r=>r.id===row.id?{...r,files:(r.files||[]).filter(x=>x.id!==f.id)}:r)}))}))}:cur);
  try{await json(`/api/projects/${pid}/files/delete`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileId:f.id})});flash('附件已刪除')}catch(e:any){setD(before);alert(e.message||'附件刪除失敗')}
 }
 const addStatus=()=>{const n=prompt('新增狀態名稱');if(!n?.trim())return;const v=n.trim();if(statuses.includes(v))return alert('這個狀態已存在');setStatuses(x=>[...x,v])}
 const renameStatus=(old:string)=>{const n=prompt(`修改狀態「${old}」為`,old);if(!n?.trim()||n.trim()===old)return;const v=n.trim();if(statuses.includes(v))return alert('這個狀態已存在');setStatuses(x=>x.map(s=>s===old?v:s));sections.flatMap(s=>s.rows).filter(r=>r.status===old).forEach(r=>updateRow(r,{status:v}))}
 const deleteStatus=(name:string)=>{if(statuses.length<=1)return alert('至少保留一個狀態');if(!confirm(`刪除狀態「${name}」？使用中的事項會改成第一個狀態。`))return;const fallback=statuses.find(s=>s!==name)||'待確認';setStatuses(x=>x.filter(s=>s!==name));sections.flatMap(s=>s.rows).filter(r=>r.status===name).forEach(r=>updateRow(r,{status:fallback}))}
 const [statusMenu,setStatusMenu]=useState(false)
 const [brandTitle,setBrandTitle]=useState(()=>{try{return localStorage.getItem('nc-brand-title')||'YB營運處'}catch{return 'YB營運處'}})
 const [editingBrand,setEditingBrand]=useState(false)
 useEffect(()=>{localStorage.setItem('nc-brand-title',brandTitle)},[brandTitle])
 const manageStatuses=()=>setStatusMenu(v=>!v)
 if(initialLoading)return <div className="center">☁️ 雲端資料載入中…</div>
 return <main className="app"><aside className="side"><div className="brandTitle">{editingBrand?<input autoFocus value={brandTitle} onChange={e=>setBrandTitle(e.target.value)} onBlur={()=>{setBrandTitle(x=>x.trim()||'YB營運處');setEditingBrand(false)}} onKeyDown={e=>{if(e.key==='Enter'){setBrandTitle(x=>x.trim()||'YB營運處');setEditingBrand(false)}}}/>:<><h2>{brandTitle}</h2><button className="brandEdit" onClick={()=>setEditingBrand(true)} title="修改名稱">✎</button></>}</div><button className="primary" onClick={newProject}>＋ 新增工作區</button><div className="label">工作區</div>{projects.map(p=><div className={'workspace '+(p.id===pid?'active':'')} key={p.id}><button onClick={()=>setPid(p.id)}>📋 {p.name}</button><button className="trash" onClick={()=>deleteProject(p.id)}>🗑</button></div>)}{!projects.length&&<div className="muted">尚未建立工作區</div>}</aside><section className="main"><header><div className="topLeft"><b>{d?.name||'雲端工作區'}</b>{d&&<button className="danger small" onClick={()=>deleteProject()} disabled={!!busy['project:'+pid]}>刪除工作區</button>}<div className="statusMenuWrap"><button className="statusManageBtn" onClick={manageStatuses}>⚙ 狀態</button>{statusMenu&&<div className="statusMenu"><div className="statusMenuTitle">狀態管理</div>{statuses.map(st=><div className="statusMenuItem" key={st}><button className="statusEditBtn" style={{background:statusColor(st)}} onClick={()=>renameStatus(st)}>{st}</button>{statuses.length>1&&<button className="statusMenuDelete" onClick={()=>deleteStatus(st)}>×</button>}</div>)}<button className="statusMenuAdd" onClick={addStatus}>＋ 新增狀態</button><div className="statusHint">至少保留一個狀態</div></div>}</div></div><div className="tools"><input placeholder="搜尋事項…" value={q} onChange={e=>setQ(e.target.value)}/></div></header>{!d?<div className="empty"><h1>建立你的第一個工作區</h1><p>工作區、分類、事項與附件會同步到 Supabase 雲端。</p><button className="primary" onClick={newProject}>＋ 建立工作區</button></div>:<article><div className="head"><div><h1>{d.name}</h1></div><button onClick={addSection} disabled={!!busy['add-section']}>＋ 新分類</button></div>{sections.map((s,i)=>{const [bg,border]=sectionColors[i%sectionColors.length];return <section className="card" key={s.id} style={{background:bg,borderLeft:`4px solid ${border}`}} onDragOver={e=>{if(drag){e.preventDefault();setDrop(s.id)}}} onDragLeave={()=>setDrop(x=>x===s.id?'':x)} onDrop={e=>{e.preventDefault();const r=sections.flatMap(x=>x.rows).find(x=>x.id===drag);if(r)moveRow(r,s);setDrag('');setDrop('')}}><div className="sect"><input value={s.name} onChange={e=>mutate({action:'updateSection',id:s.id,name:e.target.value},x=>({...x,pages:x.pages.map(p=>({...p,sections:p.sections.map(z=>z.id===s.id?{...z,name:e.target.value}:z)}))}),'section:'+s.id)}/><div><button onClick={()=>addRow(s)}>＋ 新事項</button><div className="columnMenuWrap"><button type="button" className="columnManageBtn" onClick={()=>setColumnMenu(columnMenu===s.id?'':s.id)}>⚙ 欄位</button>{columnMenu===s.id&&<div className="columnMenu"><div className="columnMenuTitle">本分類欄位</div>{visibleColumns(s.id).map(key=>{const col=columnDefs.find(x=>x[0]===key);if(!col)return null;const label=col[1];return <div className={'columnToggle '+(dragColumn?.section===s.id&&dragColumn.key===key?'columnDragging':'')} key={key} draggable onDragStart={()=>setDragColumn({section:s.id,key})} onDragOver={e=>{if(dragColumn?.section===s.id){e.preventDefault()}}} onDrop={e=>{e.preventDefault();if(dragColumn?.section===s.id){moveColumn(s.id,dragColumn.key,key);setDragColumn(null)}}} onDragEnd={()=>setDragColumn(null)}><span className="dragHandle">☷</span><input type="checkbox" checked onChange={()=>toggleColumn(s.id,key)}/><span>{label}</span></div>})}
<div className="columnHiddenTitle">隱藏欄位</div>
{columnDefs.filter(([key])=>!visibleColumns(s.id).includes(key)).map(([key,label])=><label className="columnToggle hiddenColumn" key={key}><span className="dragHandle">＋</span><input type="checkbox" checked={false} onChange={()=>toggleColumn(s.id,key)}/><span>{label}</span></label>)}</div>}</div><button className="danger small" onClick={()=>delSection(s.id)}>刪除分類</button></div></div><div className="scroll"><table><thead><tr>{visibleColumns(s.id).map(key=>{const col=columnDefs.find(x=>x[0]===key);return col?<th key={key}>{col[1]}</th>:null})}<th></th></tr></thead><tbody>{s.rows.filter(r=>`${s.name} ${r.item} ${r.project_need} ${r.owner} ${r.progress} ${r.status}`.toLowerCase().includes(q.toLowerCase())).map(r=><tr key={r.id} draggable onDragStart={()=>setDrag(r.id)} className={drop===s.id?'dragTarget':''}>
{visibleColumns(s.id).map(key=>{
 if(key==='item') return <td key={key}><input value={r.item} onChange={e=>updateRow(r,{item:e.target.value})}/></td>
 if(key==='project_need') return <td key={key}><textarea value={r.project_need||''} onChange={e=>updateRow(r,{project_need:e.target.value})}/></td>
 if(key==='owner') return <td key={key}><input value={r.owner||''} onChange={e=>updateRow(r,{owner:e.target.value})}/></td>
 if(key==='progress') return <td key={key}><textarea value={r.progress||''} onChange={e=>updateRow(r,{progress:e.target.value})}/></td>
 if(key==='status') {const st=statuses.includes(r.status)?r.status:statuses[0]; return <td key={key}><select className="statusSelect" style={{background:statusColor(st),borderColor:statusColor(st)}} value={st} onChange={e=>updateRow(r,{status:e.target.value})}>{statuses.map(x=><option key={x}>{x}</option>)}</select></td>}
 if(key==='start_date') return <td key={key}><input type="date" value={r.start_date||''} onChange={e=>updateRow(r,{start_date:e.target.value})}/></td>
 if(key==='due_date') return <td key={key}><input type="date" value={r.due_date||''} onChange={e=>updateRow(r,{due_date:e.target.value})}/></td>
 if(key==='files') return <td key={key}><div className="files">{r.files?.map(f=><div className="file" key={f.id}><span>{f.kind==='link'?'🔗':'📎'}</span><span className="fname" title={f.name}>{f.name}{f.size?` · ${size(f.size)}`:''}</span>{f.kind==='link'?<a href={f.external_url} target="_blank" rel="noreferrer">開啟</a>:<><a href={`/api/files/${f.id}?mode=open`} target="_blank">開啟</a><a href={`/api/files/${f.id}?mode=download`}>下載</a></>}<button onClick={()=>delFile(f,r)}>刪除</button></div>)}<div className="attachBtns"><label className={busy['upload:'+r.id]?'uploading':''}>＋ {busy['upload:'+r.id]?'上傳中…':'上傳'}<input type="file" multiple disabled={!!busy['upload:'+r.id]} onChange={e=>{upload(r,e.target.files);e.currentTarget.value='' }}/></label><button onClick={()=>addLink(r)} disabled={!!busy['link:'+r.id]}>🔗 加連結</button><select className="moveSelect" value="" onChange={e=>{const target=sections.find(x=>x.id===e.target.value);if(target)moveRow(r,target);e.currentTarget.value='' }}><option value="">移動到…</option>{sections.filter(x=>x.id!==s.id).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div></div></td>
 return null
})}<td><button className="danger small" onClick={()=>delRow(r.id,s.id)}>刪除</button></td>
</tr>)}</tbody></table></div></section>})}</article>}{toast&&<div className="toast">{toast}</div>}</section></main>
}
