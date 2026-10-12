import { supabase } from '@/integrations/supabase/client';

export const PRIVATE_PHOTO_BUCKET = 'student-photos';
export const PRIVATE_ASSESSMENT_BUCKET = 'assessments';

function privateMediaPath(value: string, bucket: string): string | null {
  if (!value) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const raw = value.includes(marker) ? value.split(marker)[1]?.split('?')[0] : value;
  try {
    const path = decodeURIComponent(raw ?? '');
    if (!/^[0-9a-f-]{36}\/[^/]/i.test(path) || path.includes('..') || path.startsWith('http')) return null;
    return path;
  } catch { return null; }
}

export const privatePhotoPath = (value: string) => privateMediaPath(value, PRIVATE_PHOTO_BUCKET);
export const privateAssessmentPath = (value: string) => privateMediaPath(value, PRIVATE_ASSESSMENT_BUCKET);

async function signedMediaUrl(value: string, bucket: string): Promise<string | null> {
  const path = privateMediaPath(value, bucket);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return error ? null : (data?.signedUrl ?? null);
}

export async function signedPhotoUrl(value: string): Promise<string | null> {
  return signedMediaUrl(value, PRIVATE_PHOTO_BUCKET);
}

export async function signedAssessmentUrl(value: string): Promise<string | null> {
  return signedMediaUrl(value, PRIVATE_ASSESSMENT_BUCKET);
}
