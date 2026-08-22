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
  const signedPhotos = await Promise.all(
    photoPaths.map(async (path, index) => {
      const { data, error } = await supabase.storage.from("applications").createSignedUrl(path, 300);
      if (error || !data?.signedUrl) return null;

      const filename = encodeURIComponent(getApplicationPhotoFilename(applicationId, index, path));
      return {
        viewUrl: data.signedUrl,
        downloadUrl: `${data.signedUrl}&download=${filename}`,
      };
    }),
  );
  const availablePhotos = signedPhotos.filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

  return {
    viewUrls: availablePhotos.map((photo) => photo.viewUrl),
    downloadUrls: availablePhotos.map((photo) => photo.downloadUrl),
  };
}
