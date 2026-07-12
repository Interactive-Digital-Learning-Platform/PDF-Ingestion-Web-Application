"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileStack,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { toErrorMessage } from "@/lib/api/ingestion";
import type { Job, UploadJob } from "@/lib/api/types";
import {
  ingestionQueryKeys,
  useDeleteJobMutation,
  useUploadPdfsMutation,
} from "@/lib/query/ingestion";
import type { UploadFormValues } from "@/lib/validation/upload";
import { uploadSchema } from "@/lib/validation/upload";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { JobRow } from "@/components/dashboard/dashboard-shell";
import { useUser } from "@clerk/nextjs";
import { Separator } from "@/components/ui/separator";

type StatCard = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
};
export default function Page() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const uploadMutation = useUploadPdfsMutation();
  const deleteMutation = useDeleteJobMutation();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      files: [],
    },
  });

  const files = useWatch({
    control: form.control,
    name: "files",
  });

  const onSubmit = form.handleSubmit(async ({ files }) => {
    if (!user?.id) {
      toast.error("You must be logged in to upload files.");
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        files,
        userId: user.id,
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
        } satisfies Job);
      });

      form.reset({ files: [] });
      toast.success(
        `Queued ${uploaded.length} PDF job${uploaded.length > 1 ? "s" : ""}.`,
      );
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  });

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

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = jobIds.length;
  // const completed = jobs.filter((j) => j.status === "done").length;
  // const inProgress = jobs.filter(
  //   (j) => j.status === "processing" || j.status === "queued",
  // ).length;
  // const failed = jobs.filter((j) => j.status === "failed").length;

  // const stats: StatCard[] = [
  //   {
  //     label: "Total Jobs",
  //     value: total,
  //     sub: "across this workspace",
  //     icon: FileStack,
  //   },
  //   {
  //     label: "Completed",
  //     value: 4,
  //     sub: "ready to query",
  //     icon: CheckCircle2,
  //   },
  //   {
  //     label: "In Progress",
  //     value: 4,
  //     sub: "currently ingesting",
  //     icon: Clock,
  //   },
  //   {
  //     label: "Failed",
  //     value: 4,
  //     sub: "need attention",
  //     icon: AlertTriangle,
  //   },
  // ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      form.setValue("files", Array.from(e.target?.files ?? []), {
        shouldValidate: true,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      form.setValue("files", Array.from(e.dataTransfer?.files ?? []), {
        shouldValidate: true,
      });
    }
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
      <Separator className="w-full mt-4 mb-8"/>
      {/* Stat cards */}
      {/*<div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          );
        })}
      </div>*/}

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${isDragging ? "border-foreground bg-muted/60" : "border-border bg-card hover:bg-muted/40"}`}
      >
        <form
          className="w-full h-full flex flex-col justify-center items-center"
          onSubmit={onSubmit}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
            <UploadCloud className="h-5 w-5 text-foreground" />
          </div>
          <div className="w-full h-auto flex flex-col justify-center items-center gap-3">
            <p className="text-sm font-medium">Drag &amp; drop PDFs here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to browse — single or bulk, up to 50MB each
            </p>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {form.formState.errors.files && (
            <p className="text-sm text-destructive">
              {form.formState.errors.files.message}
            </p>
          )}

          <Button type="submit" size="sm" className="mt-4">
            <UploadCloud className="mr-1.5 h-4 w-4" />
            Add to Queue
          </Button>
        </form>
      </div>

      {/* Jobs table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card mb-5">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Ingestion jobs</h2>
            <Badge variant="secondary" className="font-normal tabular-nums">
              {files.length}
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
