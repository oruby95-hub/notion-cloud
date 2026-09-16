import { NextResponse } from 'next/server'
import { getSupabase, BUCKET } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const s = getSupabase()
    const p = await s.from('projects').select('*').eq('id', projectId).single()
    if (p.error) throw p.error

    let pages = await s.from('pages').select('*').eq('project_id', projectId).order('created_at')
    if (pages.error) throw pages.error
    // Pages are an internal compatibility layer only. The UI is workspace -> section -> row.
    if (!pages.data?.length) {
      const created = await s.from('pages').insert({ project_id: projectId, name: '工作區', title: '工作區' }).select().single()
      if (created.error) throw created.error
      pages = { ...pages, data: [created.data] } as any
    }
    const pageIds = (pages.data || []).map((x: any) => x.id)
    const secs = pageIds.length
      ? await s.from('sections').select('*').in('page_id', pageIds).order('sort_order').order('id')
      : { data: [], error: null } as any
    if (secs.error) throw secs.error
    const secIds = (secs.data || []).map((x: any) => x.id)
    const rows = secIds.length
      ? await s.from('project_rows').select('*').in('section_id', secIds).order('sort_order').order('id')
      : { data: [], error: null } as any
    if (rows.error) throw rows.error
    const rowIds = (rows.data || []).map((x: any) => x.id)
    const files = rowIds.length
      ? await s.from('files').select('*').in('row_id', rowIds).order('created_at')
      : { data: [], error: null } as any
    if (files.error) throw files.error

    const out = {
      ...p.data,
      pages: (pages.data || []).map((pg: any) => ({
        ...pg,
        sections: (secs.data || []).filter((x: any) => x.page_id === pg.id).map((sec: any) => ({
          ...sec,
          rows: (rows.data || []).filter((x: any) => x.section_id === sec.id).map((r: any) => ({
            ...r,
            owner: r.assignee || '',
            files: (files.data || []).filter((f: any) => f.row_id === r.id)
          }))
        }))
      }))
    }
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '載入失敗' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const b = await req.json()
    const name = String(b.name || '').trim()
    if (!name) return NextResponse.json({ error: '請輸入工作區名稱' }, { status: 400 })
    const { data, error } = await getSupabase().from('projects').update({ name }).eq('id', projectId).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) { return NextResponse.json({ error: e?.message || '更新失敗' }, { status: 500 }) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const s = getSupabase()
    const f = await s.from('files').select('storage_path').eq('project_id', projectId)
    if (f.error) throw f.error
    const paths = (f.data || []).map((x: any) => x.storage_path).filter(Boolean)
    if (paths.length) {
      const rm = await s.storage.from(BUCKET).remove(paths)
      if (rm.error) throw rm.error
    }
    const d = await s.from('projects').delete().eq('id', projectId)
    if (d.error) throw d.error
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e?.message || '刪除失敗' }, { status: 500 }) }
}
