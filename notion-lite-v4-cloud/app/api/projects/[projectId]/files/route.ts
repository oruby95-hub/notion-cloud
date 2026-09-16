import { NextResponse } from 'next/server'
import { getSupabase, BUCKET } from '@/lib/supabase'

function safeStorageName(originalName: string) {
  const dot = originalName.lastIndexOf('.')
  const ext = dot > -1 ? originalName.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : ''
  return `${crypto.randomUUID()}${ext}`
}

async function assertRow(s: any, projectId: string, rowId: string) {
  const { data, error } = await s
    .from('project_rows')
    .select('id,project_id')
    .eq('id', rowId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('事項不存在')

  if (!data.project_id) {
    const fixed = await s.from('project_rows')
      .update({ project_id: projectId })
      .eq('id', rowId)
      .select('id')
      .single()
    if (fixed.error) throw fixed.error
  } else if (data.project_id !== projectId) {
    throw new Error('事項不存在於目前工作區')
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const s = getSupabase()
    const contentType = req.headers.get('content-type') || ''

    // URL attachment
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const rowId = String(body.rowId || '').trim()
      const url = String(body.url || '').trim()

      if (!rowId) return NextResponse.json({ error: '缺少事項' }, { status: 400 })
      if (!/^https?:\/\//i.test(url))
        return NextResponse.json({ error: '網址必須以 http:// 或 https:// 開頭' }, { status: 400 })

      await assertRow(s, projectId, rowId)

      const { data, error } = await s.from('files').insert({
        project_id: projectId,
        row_id: rowId,
        name: String(body.name || url),
        kind: 'link',
        mime_type: 'text/uri-list',
        size: 0,
        storage_path: '',
        external_url: url
      }).select().single()

      if (error) throw error
      return NextResponse.json(data)
    }

    const form = await req.formData()
    const rowId = String(form.get('rowId') || '').trim()
    const file = form.get('file')

    if (!rowId || !(file instanceof File))
      return NextResponse.json({ error: '缺少檔案或事項' }, { status: 400 })

    await assertRow(s, projectId, rowId)

    if (file.size > 100 * 1024 * 1024)
      return NextResponse.json({ error: '單檔上限 100 MB' }, { status: 400 })

    const storagePath = `${projectId}/${rowId}/${safeStorageName(file.name)}`

    const upload = await s.storage.from(BUCKET).upload(
      storagePath,
      Buffer.from(await file.arrayBuffer()),
      {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      }
    )

    if (upload.error) throw upload.error

    const { data, error } = await s.from('files').insert({
      project_id: projectId,
      row_id: rowId,
      name: file.name,
      kind: 'file',
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
      storage_path: storagePath,
      external_url: null
    }).select().single()

    // Never leave an orphaned Storage object.
    if (error) {
      await s.storage.from(BUCKET).remove([storagePath])
      throw error
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '上傳失敗' }, { status: 500 })
  }
}
