import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getSupabase().from('projects').select('*').order('created_at');
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b.name || '').trim();
    if (!name) return NextResponse.json({ error: '請輸入工作區名稱' }, { status: 400 });
    const s = getSupabase();
    const p = await s.from('projects').insert({ name }).select().single();
    if (p.error) throw p.error;

    // 建立一個隱藏的預設頁面，使用者不需要管理「新頁面」。
    const pg = await s.from('pages').insert({ project_id: p.data.id, name: '工作區', title: '工作區' }).select().single();
    if (pg.error) throw pg.error;
    const sec = await s.from('sections').insert({ project_id: p.data.id, page_id: pg.data.id, name: '一般', sort_order: 0 }).select().single();
    if (sec.error) throw sec.error;

    return NextResponse.json(p.data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
