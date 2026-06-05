import { upload } from '@vercel/blob/client';

export async function uploadFile(file) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  });
  return blob.url;
}
