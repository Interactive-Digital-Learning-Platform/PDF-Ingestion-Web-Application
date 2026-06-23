"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserButton, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toErrorMessage } from "@/lib/api/ingestion";
import type { Job, UploadJob } from "@/lib/api/types";
import { ingestionQueryKeys, useDeleteJobMutation, useJobStatusQuery, useUploadPdfsMutation } from "@/lib/query/ingestion";
import type { UploadFormValues } from "@/lib/validation/upload";
import { uploadSchema } from "@/lib/validation/upload";
import { connectJobProgress } from "@/lib/ws/jobProgress";

type UploadsTableProps = {
  jobIds: string[];
  onDelete: (jobId: string) => void;
  deletingJobId: string | null;
};

function statusVariant(status: Job["status"]): "default" | "secondary" | "destructive" {
  if (status === "done") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "secondary";
}

function JobRow({ jobId, onDelete, isDeleting }: { jobId: string; onDelete: (jobId: string) => void; isDeleting: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useJobStatusQuery(jobId, true);

  useEffect(() => {
    const unsubscribe = connectJobProgress({
      jobId,
      onEvent: (event) => {
        queryClient.setQueryData(ingestionQueryKeys.job(jobId), (oldJob: Job | undefined) => {
          if (!oldJob) {
            return oldJob;
          }
          return {
            ...oldJob,
            status: event.status === "error" ? oldJob.status : event.status,
            progress: event.progress ?? oldJob.progress,
            current_stage: event.stage ?? oldJob.current_stage,
            chunks_created: event.chunks_created ?? oldJob.chunks_created,
            pages_processed: event.pages_processed ?? oldJob.pages_processed,
            error_message:
              event.status === "error" || event.status === "failed"
                ? event.message ?? oldJob.error_message
                : oldJob.error_message,
          };
        });
      },
      onError: (message) => toast.warning(message),
    });

    return unsubscribe;
  }, [jobId, queryClient]);

  if (isLoading || !data) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
          Loading job...
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{data.filename}</TableCell>
      <TableCell>
        <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
      </TableCell>
      <TableCell className="capitalize">{data.current_stage || "queued"}</TableCell>
      <TableCell className="min-w-[180px]">
        <Progress value={Math.max(0, Math.min(100, data.progress ?? 0))} />
      </TableCell>
      <TableCell>{data.pages_processed ?? 0}</TableCell>
      <TableCell>{data.chunks_created ?? 0}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          disabled={isDeleting}
          onClick={() => onDelete(jobId)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </TableCell>
    </TableRow>
  );
}

function UploadsTable({ jobIds, onDelete, deletingJobId }: UploadsTableProps) {
  if (!jobIds.length) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No jobs yet. Upload one or more PDFs to start ingestion.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobIds.map((jobId) => (
            <JobRow
              key={jobId}
              jobId={jobId}
              onDelete={onDelete}
              isDeleting={deletingJobId === jobId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DashboardShell() {
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
  const selectedCount = files?.length ?? 0;

  const greeting = useMemo(() => {
    if (user?.firstName) {
      return `Welcome, ${user.firstName}`;
    }
    return "Welcome";
  }, [user?.firstName]);

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
      toast.success(`Queued ${uploaded.length} PDF job${uploaded.length > 1 ? "s" : ""}.`);
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground">PDF ingestion pipeline dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            Realtime tracking
          </Badge>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <Card className="mb-6 border-black/10 shadow-sm">
        <CardHeader>
          <CardTitle>Upload PDFs</CardTitle>
          <CardDescription>Select one or more PDF files to enqueue ingestion jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                form.setValue("files", files, { shouldValidate: true });
              }}
            />
            {form.formState.errors.files ? (
              <p className="text-sm text-destructive">{form.formState.errors.files.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedCount ? `${selectedCount} file(s) selected.` : "Only PDFs are accepted."}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Queue Ingestion
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-lg font-medium">Jobs</h2>
        <UploadsTable jobIds={jobIds} onDelete={handleDelete} deletingJobId={deletingJobId} />
      </section>
    </div>
  );
}
