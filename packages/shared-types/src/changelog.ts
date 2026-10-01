import { z } from "zod";

import { isCalendarDate } from "./date";

// Changelog / "Novidades" (docs/specs/changelog): admin-authored news,
// plain text, with an optional YouTube video.

export const CHANGELOG_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const changelogStatusSchema = z.enum(CHANGELOG_STATUSES);
export type ChangelogStatus = z.infer<typeof changelogStatusSchema>;

export const CHANGELOG_TITLE_MAX = 150;
export const CHANGELOG_DESCRIPTION_MAX = 5000;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
// Scheme, an exact YouTube host (optionally www./m.), then the path and
// query. No URL object: React Native's is incomplete (no searchParams).
const YOUTUBE_LINK =
  /^https?:\/\/(?:(?:www|m)\.)?(youtube\.com|youtu\.be)\/([^?#]*)(?:\?([^#]*))?/i;

// The video id of a YouTube link (watch?v=, youtu.be/, shorts/, embed/),
// or null when it isn't one. Shared by the API (which stores only the id)
// and the admin form.
export function youtubeVideoId(input: string): string | null {
  const match = YOUTUBE_LINK.exec(input.trim());
  if (!match) return null;
  const [, host, path = "", query = ""] = match;
  const segments = path.split("/").filter(Boolean);
  let id: string | undefined;
  if (host!.toLowerCase() === "youtu.be") id = segments[0];
  else if (segments[0] === "watch") id = /(?:^|&)v=([^&]*)/.exec(query)?.[1];
  else if (segments[0] === "shorts" || segments[0] === "embed") id = segments[1];
  return id && YOUTUBE_ID.test(id) ? id : null;
}

// The link the app opens for a stored video id; null if the id isn't one
// (the app never builds a link from anything else).
export const youtubeWatchUrl = (videoId: string): string | null =>
  YOUTUBE_ID.test(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : null;

export const changelogEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  videoId: z.string().nullable(),
  publishedAt: z.string(),
  // "YYYY-MM-DD"
  expiresAt: z.string().nullable(),
  readAt: z.string().nullable(),
});
export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;

export const changelogListSchema = z.object({ entries: z.array(changelogEntrySchema) });
export type ChangelogList = z.infer<typeof changelogListSchema>;

// GET /changelog/unread: the newest unread entry (legacy shows one at a
// time) and how many are waiting, that one included.
export const changelogUnreadSchema = z.object({
  entry: changelogEntrySchema.nullable(),
  total: z.number().int().nonnegative(),
});
export type ChangelogUnread = z.infer<typeof changelogUnreadSchema>;

export const adminChangelogEntrySchema = changelogEntrySchema.omit({ readAt: true }).extend({
  status: changelogStatusSchema,
  readCount: z.number().int(),
  authorName: z.string().nullable(),
});
export type AdminChangelogEntry = z.infer<typeof adminChangelogEntrySchema>;

// The admin form (pt-BR messages; the API applies the same rules).
export const changelogInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe o título.")
    .max(CHANGELOG_TITLE_MAX, `Use até ${CHANGELOG_TITLE_MAX} caracteres.`),
  description: z
    .string()
    .trim()
    .min(1, "Escreva o texto da novidade.")
    .max(CHANGELOG_DESCRIPTION_MAX, `Use até ${CHANGELOG_DESCRIPTION_MAX} caracteres.`),
  videoUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || youtubeVideoId(value) !== null, "Use um link do YouTube."),
  // "YYYY-MM-DD" or empty.
  expiresAt: z.string().refine((value) => value === "" || isCalendarDate(value), "Data inválida."),
  status: changelogStatusSchema,
});
export type ChangelogInput = z.infer<typeof changelogInputSchema>;
