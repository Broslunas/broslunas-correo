import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileId, accessToken, filename, mimeType, size } = body;

    if (!fileId || !accessToken) {
      return NextResponse.json(
        { error: 'Parámetros "fileId" y "accessToken" obligatorios' },
        { status: 400 }
      );
    }

    console.log(`Downloading file ${fileId} (${filename}) from Google Drive...`);

    // Fetch the file content from Google Drive API
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const errText = await driveResponse.text();
      console.error('Google Drive download failed:', errText);
      return NextResponse.json(
        { error: 'No se pudo descargar el archivo de Google Drive. Asegúrate de tener permisos.' },
        { status: 500 }
      );
    }

    // Convert file content to buffer
    const bytes = await driveResponse.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = mimeType || driveResponse.headers.get('content-type') || 'application/octet-stream';
    const fileSize = size || buffer.length;

    // Check size limit (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'El archivo excede el límite de 10 MB.' },
        { status: 400 }
      );
    }

    // Generate a unique key for storage in R2
    const uniqueId = crypto.randomUUID();
    const cleanFilename = filename || `drive-${fileId}`;
    const key = `${uniqueId}-${cleanFilename}`;

    console.log(`Uploading Google Drive file to R2: key=${key}, size=${fileSize}, contentType=${contentType}`);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      key,
      filename: cleanFilename,
      contentType,
      size: fileSize,
    });
  } catch (error) {
    console.error('Error in google-drive attachment API:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo de Google Drive' },
      { status: 500 }
    );
  }
}
