import type { Curriculum, DocumentTags, Job } from "@/lib/api/types";

export const EMPTY_TAGS: DocumentTags = { grade: null, subject: null };

function subjectPosition(name: string, subject: string): number {
  const full = subject.toLowerCase();
  const firstWord = full.split(" ")[0];
  const pattern = firstWord.length >= 3 && firstWord !== full ? `${full}|${firstWord}` : full;
  const match = new RegExp(`\\b(?:${pattern.replace(/[.*+?^${}()[\]\\]/g, "\\$&")})\\b`).exec(name);

  return match ? match.index : -1;
}

export function guessTags(filename: string, curriculum: Curriculum | undefined): DocumentTags {
  if (!curriculum) {
    return EMPTY_TAGS;
  }

  const name = filename.toLowerCase().replace(/[_-]+/g, " ");
  const gradeMatch = name.match(/\bgrade\s*(\d{1,2})\b/);
  const grade = gradeMatch ? Number(gradeMatch[1]) : null;

  const subject =
    curriculum.subjects
      .map((s) => ({ subject: s, position: subjectPosition(name, s) }))
      .filter((match) => match.position >= 0)
      .sort((a, b) => a.position - b.position || b.subject.length - a.subject.length)[0]
      ?.subject ?? null;

  return {
    grade: grade !== null && curriculum.grades.includes(grade) ? grade : null,
    subject,
  };
}

export function jobTags(job: Pick<Job, "caller_metadata">): DocumentTags {
  const metadata = job.caller_metadata ?? {};
  const grade = metadata.grade;
  const subject = metadata.subject;

  return {
    grade: typeof grade === "number" ? grade : null,
    subject: typeof subject === "string" ? subject : null,
  };
}

export function isUntagged(tags: DocumentTags): boolean {
  return tags.grade === null || tags.subject === null;
}
