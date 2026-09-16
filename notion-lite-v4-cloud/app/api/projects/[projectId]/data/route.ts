import {NextResponse} from 'next/server';
import {getSupabase} from '@/lib/supabase';

export async function POST(req:Request,{params}:{params:Promise<{projectId:string}>}) {
  try {
    const {projectId}=await params;
    const b=await req.json();
    const s=getSupabase();
    let data:any,error:any;

    if(b.action==='createPage') {
      ({data,error}=await s.from('pages').insert({
        project_id:projectId,title:b.title||'新頁面'
      }).select().single());
    } else if(b.action==='deletePage') {
      ({data,error}=await s.from('pages').delete().eq('id',b.id).eq('project_id',projectId));
    } else if(b.action==='updatePage') {
      ({data,error}=await s.from('pages').update({
        title:String(b.title||'')
      }).eq('id',b.id).eq('project_id',projectId).select().single());
    } else if(b.action==='createSection') {
      ({data,error}=await s.from('sections').insert({
        project_id:projectId,page_id:b.pageId,name:b.name||'新分類',sort_order:b.sortOrder||0
      }).select().single());
    } else if(b.action==='deleteSection') {
      ({data,error}=await s.from('sections').delete().eq('id',b.id).eq('project_id',projectId));
    } else if(b.action==='updateSection') {
      ({data,error}=await s.from('sections').update({
        name:String(b.name||'')
      }).eq('id',b.id).eq('project_id',projectId).select().single());
    } else if(b.action==='createRow') {
      ({data,error}=await s.from('project_rows').insert({
        project_id:projectId,section_id:b.sectionId,item:'新事項',
        project_need:'',status:'待確認',sort_order:b.sortOrder||0
      }).select().single());
    } else if(b.action==='deleteRow') {
      ({data,error}=await s.from('project_rows').delete().eq('id',b.id).eq('project_id',projectId));
    } else if(b.action==='updateRow') {
      ({data,error}=await s.from('project_rows').update({
        item:b.item??'',project_need:b.project_need??'',owner:b.owner??'',
        progress:b.progress??'',status:b.status??'待確認',
        start_date:b.start_date||null,due_date:b.due_date||null
      }).eq('id',b.id).eq('project_id',projectId).select().single());
    } else if(b.action==='moveRow') {
      const target=await s.from('sections').select('id').eq('id',b.targetSectionId).eq('project_id',projectId).maybeSingle();
      if(target.error) throw target.error;
      if(!target.data) throw Error('目標分類不存在');

      const row=await s.from('project_rows').select('id,project_id').eq('id',b.id).maybeSingle();
      if(row.error) throw row.error;
      if(!row.data) throw Error('事項不存在');

      ({data,error}=await s.from('project_rows').update({
        project_id:projectId,
        section_id:b.targetSectionId,
        sort_order:Number.isFinite(Number(b.sortOrder))?Number(b.sortOrder):0
      }).eq('id',b.id).select().single());
    } else {
      return NextResponse.json({error:'未知操作'},{status:400});
    }

    if(error) throw error;
    return NextResponse.json(data||{ok:true});
  } catch(e:any) {
    return NextResponse.json({error:e.message},{status:500});
  }
}
