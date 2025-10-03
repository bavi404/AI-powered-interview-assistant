import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

type Row = {
  id: string
  name: string
  email: string
  score: number
  level?: string
  completed: boolean
  date: string
  tags: string[]
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export function Dashboard() {
  const navigate = useNavigate()
  const candidates = useAppSelector(s => s.candidates)
  const interviews = useAppSelector(s => s.interviews)

  const baseRows = useMemo<Row[]>(() => {
    return candidates.order.map(id => {
      const c = candidates.byId[id]
      const i = interviews[id]
      const score = i?.summary?.score ?? -1
      const completed = i?.stage === 'completed'
      const date = i?.answers[0]?.submittedAt || i?.answers[0]?.startedAt || ''
      const tags: string[] = []
      if ((i?.summary?.strengths || []).some(s => /backend|api|node/i.test(s)))
        tags.push('Strong Backend')
      if ((i?.summary?.strengths || []).some(s => /react|ui|frontend/i.test(s)))
        tags.push('Strong Frontend')
      return {
        id,
        name: c.name,
        email: c.email,
        score,
        level: i?.summary?.level,
        completed,
        date,
        tags,
      }
    })
  }, [candidates, interviews])

  const [search, setSearch] = useState('')
  const fuse = useMemo(
    () => new Fuse(baseRows, { keys: ['name', 'email', 'tags'], threshold: 0.3 }),
    [baseRows]
  )
  const rows = useMemo(
    () => (search ? fuse.search(search).map(r => r.item) : baseRows),
    [search, fuse, baseRows]
  )

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={v => table.toggleAllPageRowsSelected(Boolean(v))}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(Boolean(v))}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'score',
        header: 'Score',
        cell: ({ getValue }) => {
          const v = Number(getValue())
          return <span className={scoreColor(v)}>{v >= 0 ? v : '—'}</span>
        },
      },
      { accessorKey: 'level', header: 'Level' },
      {
        accessorKey: 'completed',
        header: 'Completed?',
        cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
      },
      { accessorKey: 'date', header: 'Date' },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ getValue }) => {
          const tags = (getValue() as string[]) || []
          return (
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              {tags.map(t => (
                <span key={t} className="rounded bg-muted px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )
        },
      },
    ],
    []
  )

  const [sorting, setSorting] = useState<SortingState>([])
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const selected = table.getSelectedRowModel().rows.map(r => r.original)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interviewer Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setSearch('')}>
            Clear
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      className="cursor-pointer px-2 py-2 text-left"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/50"
                  onClick={() => navigate(`/interviewer/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-2 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected.length > 1 && (
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Compare</div>
            <div className="grid gap-3 md:grid-cols-2">
              {selected.map(s => (
                <div key={s.id} className="rounded-md border p-2">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs">
                    <span className={scoreColor(s.score)}>
                      Score: {s.score >= 0 ? s.score : '—'}
                    </span>
                    <span className="ml-2">Level: {s.level ?? '—'}</span>
                  </div>
                  {/* Placeholder for radar/skill visualization */}
                  <div className="mt-2 h-24 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
