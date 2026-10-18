"use client";

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  MoreHorizontal,
  Download,
  Trash2,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Table2,
  Plus,
  Layers,
  FileStack,
  Loader2,
  Tags,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner';

import { toErrorMessage } from '@/lib/api/ingestion'
import type { DocumentTags, Job } from '@/lib/api/types'
import {
  ingestionQueryKeys,
  useCurriculumQuery,
  useDeleteJobMutation,
  useJobsQuery,
  useUpdateJobTagsMutation,
} from '@/lib/query/ingestion'
import { useQueryClient } from '@tanstack/react-query'
import { EMPTY_TAGS, isUntagged, jobTags } from '@/lib/tags'
import { TagSelects, formatTags } from '@/components/dashboard/tag-selects'

function formatAddedDate(job: Job): string {
  const value = job.completed_at ?? job.started_at
  if (!value) {
    return "—"
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function DocumentsPage() {
  const { data: jobs, isLoading } = useJobsQuery()
  const deleteMutation = useDeleteJobMutation()
  const queryClient = useQueryClient()
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const { data: curriculum } = useCurriculumQuery()
  const updateTagsMutation = useUpdateJobTagsMutation()
  const [editing, setEditing] = useState<Job | null>(null)
  const [editTags, setEditTags] = useState<DocumentTags>(EMPTY_TAGS)

  const openTagEditor = (job: Job) => {
    setEditing(job)
    setEditTags(jobTags(job))
  }

  const saveTags = async () => {
    if (!editing) {
      return
    }
    try {
      const updated = await updateTagsMutation.mutateAsync({
        jobId: editing.job_id,
        tags: editTags,
      })
      queryClient.setQueryData<Job[]>(ingestionQueryKeys.jobs(), (prev) =>
        prev?.map((job) => (job.job_id === updated.job_id ? updated : job)),
      )
      toast.success(`Updated tags for "${editing.filename}".`)
      setEditing(null)
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  const documents = useMemo(
    () => (jobs ?? []).filter((j) => j.status === 'done' || j.status === 'failed'),
    [jobs],
  )
  const indexedDocuments = useMemo(() => documents.filter((d) => d.status === 'done'), [documents])

  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () =>
      documents.filter((d) =>
        d.filename.toLowerCase().includes(query.toLowerCase()),
      ),
    [documents, query],
  )
  const totalPages = indexedDocuments.reduce((sum, d) => sum + (d.pages_processed ?? 0), 0)
  const totalChunks = indexedDocuments.reduce((sum, d) => sum + (d.chunks_created ?? 0), 0)

  const handleDelete = async (jobId: string, filename: string) => {
    try {
      setDeletingJobId(jobId)
      await deleteMutation.mutateAsync(jobId)
      queryClient.setQueryData<Job[]>(ingestionQueryKeys.jobs(), (prev) =>
        prev?.filter((job) => job.job_id !== jobId),
      )
      toast.success(`Deleted "${filename}".`)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setDeletingJobId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage your ingested knowledge base.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/dashboard/upload">
            <Plus className="mr-1.5 h-4 w-4" />
            New Document
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <div className="bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Documents
            </span>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {indexedDocuments.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            in your knowledge base
          </p>
        </div>
        <div className="bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Pages
            </span>
            <FileStack className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {totalPages}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            processed and indexed
          </p>
        </div>
        <div className="bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Chunks
            </span>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {totalChunks}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            embedded for retrieval
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Table2 className="mr-1.5 h-4 w-4" />
            Table View
          </Button>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="mr-1.5 h-4 w-4" />
            Sort
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents"
              className="h-9 w-56 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Documents table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[34%]">Document</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-sm font-medium">Loading documents...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="h-7 w-7 opacity-40" />
                    <p className="text-sm font-medium">
                      {query
                        ? 'No documents match your search.'
                        : 'No documents yet.'}
                    </p>
                    {!query && (
                      <p className="text-xs">
                        Upload PDFs to populate your knowledge base.
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow key={doc.job_id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                        <FileText className="h-4 w-4 text-foreground" />
                      </div>
                      <span className="truncate font-medium">
                        {doc.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isUntagged(jobTags(doc))
                          ? 'text-sm text-amber-600 dark:text-amber-400'
                          : 'text-sm text-muted-foreground'
                      }
                    >
                      {formatTags(jobTags(doc))}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {doc.pages_processed ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-normal tabular-nums"
                    >
                      {doc.chunks_created ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.status === 'done' ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-transparent bg-green-500/10 font-normal text-green-600 dark:bg-green-500/15 dark:text-green-400"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Indexed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1.5 font-normal">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatAddedDate(doc)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${doc.filename}`}
                          disabled={deletingJobId === doc.job_id}
                          className="text-muted-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openTagEditor(doc)}>
                          <Tags className="mr-2 h-4 w-4" />
                          Edit tags
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(doc.job_id, doc.filename)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tags</DialogTitle>
            <DialogDescription>
              {editing?.filename}. The assistant searches books from the student&apos;s grade and
              subject first. Changes apply straight away, with no re-ingestion.
            </DialogDescription>
          </DialogHeader>
          <TagSelects
            curriculum={curriculum}
            value={editTags}
            onChange={setEditTags}
            disabled={updateTagsMutation.isPending}
            label={editing?.filename}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={updateTagsMutation.isPending} onClick={() => void saveTags()}>
              {updateTagsMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
