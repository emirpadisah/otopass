import "server-only";

import { isLocalDataMode } from "@/lib/data-mode";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ApplicationPhotoUrls = {
  viewUrls: string[];
  downloadUrls: string[];
};

function getPhotoExtension(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension && ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
}

export function getApplicationPhotoFilename(applicationId: string, index: number, path: string): string {
  return `pol-car-${applicationId}-${index + 1}.${getPhotoExtension(path)}`;
}

export async function getApplicationPhotoUrls(
  applicationId: string,
  photoPaths: string[],
): Promise<ApplicationPhotoUrls> {
  if (photoPaths.length === 0) return { viewUrls: [], downloadUrls: [] };

  if (isLocalDataMode()) {
    return {
      viewUrls: photoPaths.map((_, index) => `/api/applications/${applicationId}/photos?index=${index}`),
      downloadUrls: photoPaths.map(
        (_, index) => `/api/applications/${applicationId}/photos?index=${index}&download=1`,
      ),
    };
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from("applications").createSignedUrls(photoPaths, 300);
  if (error || !data) return { viewUrls: [], downloadUrls: [] };
  const signedUrlByPath = new Map(data.filter((item) => !item.error && item.path).map((item) => [item.path, item.signedUrl]));
  const signedPhotos = photoPaths.map((path, index) => {
    const signedUrl = signedUrlByPath.get(path);
    if (!signedUrl) return null;
    const filename = encodeURIComponent(getApplicationPhotoFilename(applicationId, index, path));
    return {
      viewUrl: signedUrl,
      downloadUrl: `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}download=${filename}`,
    };
  });
  const availablePhotos = signedPhotos.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

  return {
    viewUrls: availablePhotos.map((photo) => photo.viewUrl),
    downloadUrls: availablePhotos.map((photo) => photo.downloadUrl),
  };
}
