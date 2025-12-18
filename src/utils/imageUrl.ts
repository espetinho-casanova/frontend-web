import { env } from "../config/env";

export function getImageUrl(filename: string | null | undefined): string {
  if (!filename) return "";
  return `${env.NEXT_PUBLIC_API_URL}/files/${filename}`;
}

