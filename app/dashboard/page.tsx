"use client";

import React, { useMemo, useState } from 'react'
import {
  FileText,
  MoreHorizontal,
  Download,
  Trash2,
  ExternalLink,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Table2,
  Plus,
  Layers,
  FileStack,
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
import { toast } from 'sonner';


export default function DocumentsPage() {

  const [jobs, setJobs] = useState([
    {
      id: '1',
      filename: 'Q3_Financial_Report.pdf',
      status: 'done',
      stage: 'completed',
      progress: 100,
      pages: 45,
      chunks: 342,
    },
    {
      id: '2',
      filename: 'Employee_Handbook_2024.pdf',
      status: 'failed',
      stage: 'extracting',
      progress: 32,
      pages: 12,
      chunks: 45,
    },
    {
      id: '3',
      filename: 'Product_Roadmap_v2.pdf',
      status: 'processing',
      stage: 'chunking',
      progress: 65,
      pages: 8,
      chunks: 112,
    },
  ])
  
  const documents = jobs.filter((j) => j.status === 'done')
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () =>
      documents.filter((d) =>
        d.filename.toLowerCase().includes(query.toLowerCase()),
      ),
    [documents, query],
  )
  const totalPages = documents.reduce((sum, d) => sum + d.pages, 0)
  const totalChunks = documents.reduce((sum, d) => sum + d.chunks, 0)
  const handleDelete = (id: string, name: string) => {
    // deleteJob(id)
    toast.success(`Deleted "${name}".`)
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
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Document
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
            {documents.length}
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
              <TableHead className="w-[42%]">Document</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-40 text-center">
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
                <TableRow key={doc.id} className="group">
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
                  <TableCell className="tabular-nums text-muted-foreground">
                    {doc.pages}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-normal tabular-nums"
                    >
                      {doc.chunks}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5 font-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                      Indexed
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    Just now
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${doc.filename}`}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View source
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(doc.id, doc.filename)}
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
    </div>
  )
}
