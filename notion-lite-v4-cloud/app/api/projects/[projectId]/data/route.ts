import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const b = await req.json()
    const s = getSupabase()
    const action = String(b.action || '')

    if (action === 'createSection') {
      let pageId = String(b.pageId || '')
      if (!pageId) {
        const pg = await s.from('pages').select('id').eq('project_id', projectId).order('created_at').limit(1).maybeSingle()
        if (pg.error) return NextResponse.json({ error: pg.error.message }, { status: 500 })
        pageId = pg.data?.id || ''
      }
      if (!pageId) {
        const pg = await s.from('pages').insert({ project_id: projectId, name: '工作區', title: '工作區' }).select('id').single()
        if (pg.error) return NextResponse.json({ error: pg.error.message }, { status: 500 })
        pageId = pg.data.id
      }
      const r = await s.from('sections').insert({ project_id: projectId, page_id: pageId, name: String(b.name || '新分類'), sort_order: Number(b.sortOrder || 0) }).select().single()
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json(r.data)
    }

    if (action === 'deleteSection') {
      const r = await s.from('sections').delete().eq('id', String(b.id)).eq('project_id', projectId)
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'updateSection') {
      const r = await s.from('sections').update({ name: String(b.name || '') }).eq('id', String(b.id)).eq('project_id', projectId).select().single()
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json(r.data)
    }

    if (action === 'createRow') {
      const r = await s.from('project_rows').insert({
        project_id: projectId, section_id: String(b.sectionId), item: '新事項',
        project_need: '', assignee: '', progress: '', status: String(b.status || '待確認'),
        sort_order: Number(b.sortOrder || 0)
      }).select().single()
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ...r.data, owner: r.data.assignee || '', files: [] })
    }

    if (action === 'updateRow') {
      const patch: Record<string, any> = {}
      for (const k of ['item','project_need','progress','status','start_date','due_date']) if (k in b) patch[k] = b[k]
      if ('owner' in b) patch.assignee = String(b.owner || '')
      const r = await s.from('project_rows').update(patch).eq('id', String(b.id)).eq('project_id', projectId).select().single()
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ...r.data, owner: r.data.assignee || '' })
    }

    if (action === 'deleteRow') {
      const r = await s.from('project_rows').delete().eq('id', String(b.id)).eq('project_id', projectId)
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'moveRow') {
      const targetId = String(b.targetSectionId || '')
      const rowId = String(b.id || '')
      const target = await s.from('sections').select('id').eq('id', targetId).eq('project_id', projectId).maybeSingle()
      if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 })
      if (!target.data) return NextResponse.json({ error: '目標分類不存在' }, { status: 400 })
      const row = await s.from('project_rows').select('id').eq('id', rowId).eq('project_id', projectId).maybeSingle()
      if (row.error) return NextResponse.json({ error: row.error.message }, { status: 500 })
      if (!row.data) return NextResponse.json({ error: '事項不存在' }, { status: 400 })
      const moved = await s.from('project_rows').update({ section_id: targetId, sort_order: Number(b.sortOrder || 0) }).eq('id', rowId).eq('project_id', projectId).select().single()
      if (moved.error) return NextResponse.json({ error: moved.error.message }, { status: 500 })
      return NextResponse.json(moved.data)
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '操作失敗' }, { status: 500 })
  }
}
