import { S3Client } from '@aws-sdk/client-s3';

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
