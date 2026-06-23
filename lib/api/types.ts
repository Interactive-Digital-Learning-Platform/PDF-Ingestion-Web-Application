export type JobStatus = "queued" | "processing" | "done" | "failed";

export type Job = {
  job_id: string;
  user_id: string;
  filename: string;
  minio_object_key: string;
  qdrant_collection: string;
  status: JobStatus;
  progress: number;
  current_stage: string;
  chunks_created: number;
  pages_processed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type UploadJob = {
  job_id: string;
  filename: string;
  status: JobStatus;
};

export type UploadResponse = {
  jobs: UploadJob[];
};

export type WsProgressEvent = {
  job_id: string;
  status: JobStatus | "error";
  stage?: string;
  progress?: number;
  message?: string;
  chunks_created?: number;
  pages_processed?: number;
};

export type ApiError = {
  detail?: string;
  message?: string;
};
