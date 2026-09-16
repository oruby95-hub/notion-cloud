import {NextResponse} from 'next/server';
import {getSupabase,BUCKET} from '@/lib/supabase';

function storageSafeName(originalName: string) {
  const ext = originalName.includes('.')
    ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase()
    : '';
  return `${crypto.randomUUID()}${ext}`;
}

async function ensureRow(s:any, projectId:string, rowId:string) {
  const row=await s.from('project_rows').select('id,project_id').eq('id',rowId).maybeSingle();
  if(row.error) throw row.error;
  if(!row.data) throw Error('事項不存在');

  // 相容早期資料：如果舊資料 project_id 沒有補上，補回目前工作區。
  if(!row.data.project_id) {
    const fixed=await s.from('project_rows').update({project_id:projectId}).eq('id',rowId).select('id').single();
    if(fixed.error) throw fixed.error;
  } else if(row.data.project_id!==projectId) {
    throw Error('事項不存在於目前工作區');
  }
}

export async function POST(req:Request,{params}:{params:Promise<{projectId:string}>}) {
  try {
    const {projectId}=await params;
    const s=getSupabase();
    const ct=req.headers.get('content-type')||'';

    if(ct.includes('application/json')) {
      const b=await req.json();
      const rowId=String(b.rowId||'').trim();
      if(!rowId) return NextResponse.json({error:'缺少事項'}, {status:400});
      await ensureRow(s,projectId,rowId);

      const url=String(b.url||'').trim();
      if(!/^https?:\/\//i.test(url))
        return NextResponse.json({error:'網址必須以 http:// 或 https:// 開頭'},{status:400});

      const {data,error}=await s.from('files').insert({
        project_id:projectId,row_id:rowId,name:String(b.name||url),
        size:0,mime_type:'text/uri-list',storage_path:'',
        kind:'link',external_url:url
      }).select().single();

      if(error) throw error;
      return NextResponse.json(data);
    }

    const form=await req.formData();
    const rowId=String(form.get('rowId')||'').trim();
    const file=form.get('file');

    if(!(file instanceof File)||!rowId)
      return NextResponse.json({error:'缺少檔案或事項'},{status:400});

    await ensureRow(s,projectId,rowId);

    if(file.size>100*1024*1024)
      return NextResponse.json({error:'單檔上限 100 MB'},{status:400});

    const id=crypto.randomUUID();
    const ext=file.name.includes('.')
      ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      : '';
    const path=`${projectId}/${rowId}/${storageSafeName(file.name)}`;

    const up=await s.storage.from(BUCKET).upload(
      path,
      Buffer.from(await file.arrayBuffer()),
      {
        contentType:file.type||'application/octet-stream',
        upsert:false
      }
    );

    if(up.error) throw up.error;

    const ins=await s.from('files').insert({
      id,project_id:projectId,row_id:rowId,name:file.name,
      size:file.size,mime_type:file.type||'application/octet-stream',
      storage_path:path,kind:'file',external_url:null
    }).select().single();

    if(ins.error) {
      await s.storage.from(BUCKET).remove([path]);
      throw ins.error;
    }

    return NextResponse.json(ins.data);
  } catch(e:any) {
    return NextResponse.json({error:e.message},{status:500});
  }
}
