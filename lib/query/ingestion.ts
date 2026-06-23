"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteJob, getJobStatus, uploadPdfs } from "@/lib/api/ingestion";

export const ingestionQueryKeys = {
  job: (jobId: string) => ["ingestion-job", jobId] as const,
};

export function useUploadPdfsMutation() {
  return useMutation({
    mutationFn: uploadPdfs,
  });
}

export function useJobStatusQuery(jobId: string, enabled = true) {
  return useQuery({
    queryKey: ingestionQueryKeys.job(jobId),
    queryFn: () => getJobStatus(jobId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : 5000;
    },
  });
}

export function useDeleteJobMutation() {
  return useMutation({
    mutationFn: deleteJob,
  });
}
