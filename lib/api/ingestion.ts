import axios from "axios";
import { apiClient } from "@/lib/api/client";
import type { ApiError, Job, UploadResponse } from "@/lib/api/types";

export function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.detail ?? data?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

export async function uploadPdfs(params: { files: File[]; userId: string }): Promise<UploadResponse> {
  const formData = new FormData();
  params.files.forEach((file) => formData.append("files", file));
  formData.append("user_id", params.userId);

  const response = await apiClient.post<UploadResponse>("/ingest/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function getJobStatus(jobId: string): Promise<Job> {
  const response = await apiClient.get<Job>(`/ingest/status/${jobId}`);
  return response.data;
}

export async function deleteJob(jobId: string): Promise<{ message: string; qdrant_deleted: number }> {
  const response = await apiClient.delete<{ message: string; qdrant_deleted: number }>(
    `/ingest/${jobId}`,
  );
  return response.data;
}
