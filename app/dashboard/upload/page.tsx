"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { toErrorMessage } from "@/lib/api/ingestion";
import type { DocumentTags, Job, UploadJob } from "@/lib/api/types";
import {
  ingestionQueryKeys,
  useCurriculumQuery,
  useDeleteJobMutation,
  useUploadPdfsMutation,
} from "@/lib/query/ingestion";
import { uploadSchema } from "@/lib/validation/upload";
import { EMPTY_TAGS, guessTags, isUntagged } from "@/lib/tags";
import { TagSelects } from "@/components/dashboard/tag-selects";

import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { JobRow } from "@/components/dashboard/dashboard-shell";
import { useUser } from "@clerk/nextjs";
import { Separator } from "@/components/ui/separator";

type StagedFile = {
  id: string;
  file: File;
  tags: DocumentTags;
};

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function Page() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [bulkTags, setBulkTags] = useState<DocumentTags>(EMPTY_TAGS);
  const uploadMutation = useUploadPdfsMutation();
  const deleteMutation = useDeleteJobMutation();
  const { data: curriculum, isError: curriculumFailed } = useCurriculumQuery();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadMutation.isPending;
  const untaggedCount = staged.filter((item) => isUntagged(item.tags)).length;

  const stageFiles = (selectedFiles: File[]) => {
    const parsed = uploadSchema.safeParse({ files: selectedFiles });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid file selection.");
      return;
    }

    setStaged((prev) => [
      ...prev,
      ...parsed.data.files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        tags: guessTags(file.name, curriculum),
      })),
    ]);
  };

  const updateTags = (id: string, tags: DocumentTags) => {
    setStaged((prev) => prev.map((item) => (item.id === id ? { ...item, tags } : item)));
  };

  const applyToAll = (tags: DocumentTags) => {
    setBulkTags(tags);
    setStaged((prev) => prev.map((item) => ({ ...item, tags })));
  };

  const startUpload = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to upload files.");
      return;
    }

    if (!staged.length) {
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        files: staged.map((item) => item.file),
        userId: user.id,
        tags: staged.map((item) => item.tags),
      });

      const uploaded = result.jobs as UploadJob[];
      const newIds = uploaded.map((job) => job.job_id);
      setJobIds((prev) => Array.from(new Set([...newIds, ...prev])));

      uploaded.forEach((job) => {
        queryClient.setQueryData(ingestionQueryKeys.job(job.job_id), {
          job_id: job.job_id,
          user_id: user.id,
          filename: job.filename,
          minio_object_key: "",
          qdrant_collection: "",
          status: job.status,
          progress: 0,
          current_stage: "queued",
          chunks_created: 0,
          pages_processed: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
          caller_metadata: job.caller_metadata ?? null,
        } satisfies Job);
      });

      setStaged([]);
      setBulkTags(EMPTY_TAGS);
      toast.success(
        `Queued ${uploaded.length} PDF job${uploaded.length > 1 ? "s" : ""}.`,
      );
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      setDeletingJobId(jobId);
      await deleteMutation.mutateAsync(jobId);
      setJobIds((prev) => prev.filter((id) => id !== jobId));
      queryClient.removeQueries({ queryKey: ingestionQueryKeys.job(jobId) });
      toast.success("Job deleted.");
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length) {
      stageFiles(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length) {
      stageFiles(dropped);
    }
  };

  const openFilePicker = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload new documents to update the knowledge base of the Kit AI.
          </p>
        </div>
      </div>
      <Separator className="w-full mt-4 mb-8" />

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-disabled={isUploading}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        } ${isDragging ? "border-foreground bg-muted/60" : "border-border bg-card hover:bg-muted/40"}`}
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
          <UploadCloud className="h-5 w-5 text-foreground" />
        </div>
        <div className="w-full h-auto flex flex-col justify-center items-center gap-3">
          <p className="text-sm font-medium">Drag &amp; drop PDFs here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse — single or bulk, up to 50MB each. You can set each
            file&apos;s grade and subject before ingestion starts.
          </p>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <Button
          type="button"
          size="sm"
          className="mt-4"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            openFilePicker();
          }}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Choose PDFs
        </Button>
      </div>

      {staged.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Ready to ingest</h2>
              <Badge variant="secondary" className="font-normal tabular-nums">
                {staged.length}
              </Badge>
            </div>
            {staged.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Apply to all</span>
                <TagSelects
                  curriculum={curriculum}
                  value={bulkTags}
                  onChange={applyToAll}
                  disabled={isUploading}
                  label="all files"
                />
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted">
                <TableHead className="w-[40%]">Filename</TableHead>
                <TableHead>Grade and subject</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="truncate font-medium">{item.file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatSize(item.file.size)}</div>
                  </TableCell>
                  <TableCell>
                    <TagSelects
                      curriculum={curriculum}
                      value={item.tags}
                      onChange={(tags) => updateTags(item.id, tags)}
                      disabled={isUploading}
                      label={item.file.name}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.file.name}`}
                      disabled={isUploading}
                      onClick={() =>
                        setStaged((prev) => prev.filter((other) => other.id !== item.id))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {curriculumFailed
                ? "Couldn't load the grade and subject lists. Files will be ingested untagged; you can tag them later from My Documents."
                : untaggedCount > 0
                  ? `${untaggedCount} file${untaggedCount > 1 ? "s are" : " is"} missing a grade or subject. Untagged files are still searched, but the assistant can't prefer them for a student's grade or subject.`
                  : "Grades and subjects let the assistant search the right books first."}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => {
                  setStaged([]);
                  setBulkTags(EMPTY_TAGS);
                }}
              >
                Clear
              </Button>
              <Button type="button" size="sm" disabled={isUploading} onClick={() => void startUpload()}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-1.5 h-4 w-4" />
                    Start ingestion
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card mb-5">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Ingestion jobs</h2>
            <Badge variant="secondary" className="font-normal tabular-nums">
              {jobIds.length}
            </Badge>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted">
              <TableHead className="w-[30%]">Filename</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="w-[22%]">Progress</TableHead>
              <TableHead className="text-right">Pages</TableHead>
              <TableHead className="text-right">Chunks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobIds.map((jobId) => (
              <JobRow
                key={jobId}
                jobId={jobId}
                onDelete={() => handleDelete(jobId)}
                isDeleting={deletingJobId === jobId}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
