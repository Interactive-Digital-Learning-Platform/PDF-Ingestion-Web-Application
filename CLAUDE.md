# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Next.js, http://localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config: eslint-config-next core-web-vitals + typescript)
```

There is no test suite configured in this repo.

## What this app is

A Next.js (App Router) frontend for a PDF ingestion pipeline. Users upload PDFs, which are handed off to a separate backend API for processing (extraction/chunking/embedding), and the UI tracks each ingestion job's progress in real time. Auth is handled by Clerk.

The actual PDF processing (extraction, chunking, embedding, storage in MinIO/Qdrant) happens in a separate backend service, not in this repo — this app only calls that backend's HTTP/WebSocket API.

## Environment variables

Defined in `.env` (values not committed):

- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `NEXT_PUBLIC_API_BASE_URL` — backend REST base URL (defaults to `http://localhost:8000`)
- `NEXT_PUBLIC_WS_BASE_URL` — backend WebSocket base URL (defaults to deriving from `NEXT_PUBLIC_API_BASE_URL` by swapping `http`→`ws`)
- `NEXT_PUBLIC_MAX_FILE_SIZE_MB` — client-side upload size cap (default 20)

## Architecture

**Auth & routing.** `proxy.ts` (this Next.js version's replacement for the conventional `middleware.ts` — see `AGENTS.md`) runs `clerkMiddleware` and protects everything under `/dashboard`. `app/page.tsx` is a server component that redirects to `/dashboard` or `/sign-in` based on auth state. Sign-in/sign-up live under the `app/(auth)/` route group using Clerk's catch-all pages.

**Data flow for ingestion jobs** is layered:
- `lib/api/client.ts` — shared axios instance (`apiClient`), base URL from `NEXT_PUBLIC_API_BASE_URL`.
- `lib/api/ingestion.ts` — raw API calls: `uploadPdfs`, `getJobStatus`, `deleteJob`, plus `toErrorMessage` for normalizing axios/API errors for toasts.
- `lib/api/types.ts` — shared types (`Job`, `JobStatus`, `UploadResponse`, `WsProgressEvent`, etc.) mirroring the backend's job schema.
- `lib/query/ingestion.ts` — TanStack Query hooks (`useUploadPdfsMutation`, `useJobStatusQuery`, `useDeleteJobMutation`). `useJobStatusQuery` polls every 5s via `refetchInterval` until the job reaches `done`/`failed`, acting as a fallback when the WebSocket isn't delivering updates.
- `lib/ws/jobProgress.ts` — `connectJobProgress` opens a WebSocket to `{WS_BASE}/ingest/ws/{jobId}` and pushes `WsProgressEvent`s to a callback; closes itself on terminal status. Errors from the socket surface as a toast telling the user polling is taking over — the query polling above is what actually keeps data fresh in that case.
- `components/dashboard/dashboard-shell.tsx` — exports `JobRow`, the per-job table row that wires together `useJobStatusQuery` (initial/poll fetch) and `connectJobProgress` (live updates via `queryClient.setQueryData`), plus `DashboardShell`, a self-contained upload+jobs-table view. `app/dashboard/upload/page.tsx` reimplements the same upload-form/job-list wiring inline and reuses only `JobRow` from that file — the upload flow logic (react-hook-form + zod, mutation calls, job id tracking) is duplicated between the two rather than shared.
- `lib/validation/upload.ts` — zod schema enforcing PDF mime type and per-file size limit, driving the upload form via `@hookform/resolvers/zod`.

**Note:** `app/dashboard/page.tsx` ("My Documents") currently renders from local hardcoded mock state (`useState` with sample jobs) — it is not wired to the `lib/api`/`lib/query` layer yet. `app/dashboard/upload/page.tsx` and `dashboard-shell.tsx` are the ones actually integrated with the backend.

**UI components.** `components/ui/*` are shadcn components (`components.json`, style `radix-nova`, base color `neutral`, icons from `lucide-react`). Sidebar/nav (`app-sidebar.tsx`, `nav-main.tsx`, `nav-user.tsx`, `team-switcher.tsx`) still contain shadcn-template sample data (e.g. team switcher, nav-projects) not yet replaced with real data.

**Providers.** `app/layout.tsx` wraps the tree in `ClerkProvider` → `TooltipProvider` → `Providers` (`app/providers.tsx`, a client component owning the `QueryClient` with `retry: 1`, `refetchOnWindowFocus: false`) → page content, with a global `sonner` `Toaster`.
