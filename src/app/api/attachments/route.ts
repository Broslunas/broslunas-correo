import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const filename = searchParams.get('filename') || 'adjunto';

    if (!key) {
      return NextResponse.json({ error: 'Parámetro "key" obligatorio' }, { status: 400 });
    }

    console.log(`Streaming secure attachment key: ${key} (filename: ${filename}) from R2...`);

    // Fetch object from R2 via S3 SDK client
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 404 });
    }

    // S3 Node response body implements ReadableStream interface or can be piped directly
    const stream = s3Response.Body as any;

    // Set response headers
    const contentType = s3Response.ContentType || 'application/octet-stream';
    const headers = new Headers();
    // Images are served inline so the browser can render them (e.g. inside email bodies).
    // All other files force a download.
    const disposition = contentType.startsWith('image/') ? 'inline' : 'attachment';
    headers.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', contentType);
    if (s3Response.ContentLength) {
      headers.set('Content-Length', s3Response.ContentLength.toString());
    }

    return new Response(stream, { headers });
  } catch (error) {
    console.error('Error fetching file from Cloudflare R2:', error);
    return NextResponse.json({ error: 'Error al descargar el archivo' }, { status: 500 });
  }
}
