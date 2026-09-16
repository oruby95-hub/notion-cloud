import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const b = await req.json()
    const s = getSupabase()
    let data: any = null, error: any = null

    if (b.action === 'createSection') {
      let pageId = b.pageId
      if (!pageId) {
        const pg = await s.from('pages').select('id').eq('project_id', projectId).order('created_at').limit(1).maybeSingle()
        if (pg.error) throw pg.error
        if (pg.data) pageId = pg.data.id
        else {
          const created = await s.from('pages').insert({ project_id: projectId, name: '工作區', title: '工作區' }).select('id').single()
          if (created.error) throw created.error
          pageId = created.data.id
        }
      }
      ({ data, error } = await s.from('sections').insert({ project_id: projectId, page_id: pageId, name: b.name || '新分類', sort_order: Number(b.sortOrder || 0) }).select().single())
    } else if (b.action === 'deleteSection') {
      ({ data, error } = await s.from('sections').delete().eq('id', b.id).eq('project_id', projectId))
    } else if (b.action === 'updateSection') {
      ({ data, error } = await s.from('sections').update({ name: String(b.name || '') }).eq('id', b.id).eq('project_id', projectId).select().single())
    } else if (b.action === 'createRow') {
      ({ data, error } = await s.from('project_rows').insert({ project_id: projectId, section_id: b.sectionId, item: '新事項', project_need: '', assignee: '', progress: '', status: b.status || '待確認', sort_order: Number(b.sortOrder || 0) }).select().single())
    } else if (b.action === 'deleteRow') {
      ({ data, error } = await s.from('project_rows').delete().eq('id', b.id).eq('project_id', projectId))
    } else if (b.action === 'updateRow') {
      ({ data, error } = await s.from('project_rows').update({ item: b.item ?? '', project_need: b.project_need ?? '', assignee: b.owner ?? b.assignee ?? '', progress: b.progress ?? '', status: b.status ?? '待確認', start_date: b.start_date || null, due_date: b.due_date || null }).eq('id', b.id).eq('project_id', projectId).select().single())
    } else if (b.action === 'moveRow') {
      const target = await s.from('sections').select('id').eq('id', b.targetSectionId).eq('project_id', projectId).maybeSingle()
      if (target.error) throw target.error
      if (!target.data) return NextResponse.json({ error: '目標分類不存在' }, { status: 400 })
      ({ data, error } = await s.from('project_rows').update({ section_id: b.targetSectionId, sort_order: Number(b.sortOrder || 0) }).eq('id', b.id).eq('project_id', projectId).select().single())
    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
    if (error) throw error
    return NextResponse.json(data || { ok: true })
  } catch (e: any) { return NextResponse.json({ error: e?.message || '操作失敗' }, { status: 500 }) }
}
