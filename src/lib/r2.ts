import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = process.env.R2_ENDPOINT;

if (!accessKeyId || !secretAccessKey || !endpoint) {
  console.warn('R2 Storage environment variables are missing. Secure attachments will not function.');
}

// AWS SDK S3 Client configured to target Cloudflare R2
export const s3Client = new S3Client({
  region: 'auto',
  endpoint: endpoint || undefined,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'webmail-attachments';

export async function deleteR2Objects(keys: string[]) {
  if (!keys.length || !accessKeyId || !secretAccessKey || !endpoint) return;
  // ponytail: S3 DeleteObjects max 1000 keys per call. Upgrade if concurrent purges needed.
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: chunk.map(Key => ({ Key })), Quiet: true }
    })).catch(err => console.error('R2 delete error:', err));
  }
}
