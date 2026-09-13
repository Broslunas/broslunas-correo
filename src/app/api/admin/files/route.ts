import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, deleteR2Objects } from '@/lib/r2';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function verifyAdminSession(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) return { success: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user || user.role !== 'admin') {
      return { success: false, errorResponse: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
    }
    return { success: true, email };
  } catch {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

function detectCategory(filename: string, contentType: string = ''): 'image' | 'document' | 'spreadsheet' | 'archive' | 'media' | 'other' {
  const lowerName = filename.toLowerCase();
  const ext = lowerName.split('.').pop() || '';

  if (contentType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || contentType.includes('spreadsheet') || contentType.includes('csv')) {
    return 'spreadsheet';
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'].includes(ext) || contentType.includes('pdf') || contentType.includes('word') || contentType.startsWith('text/')) {
    return 'document';
  }
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'].includes(ext) || contentType.includes('zip') || contentType.includes('compressed')) {
    return 'archive';
  }
  if (contentType.startsWith('audio/') || contentType.startsWith('video/') || ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return 'media';
  }
  return 'other';
}

// GET: List all files in R2 enriched with email metadata
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const category = searchParams.get('category') || 'all';
    const mailbox = searchParams.get('mailbox')?.toLowerCase().trim() || '';
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date' | 'size' | 'name'
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 1. Fetch objects from R2 (ListObjectsV2 up to 2000 items)
    const objects: Array<{ Key: string; Size: number; LastModified?: Date }> = [];
    let continuationToken: string | undefined = undefined;

    do {
      const listCommand: any = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const listResponse: any = await s3Client.send(listCommand).catch((err) => {
        console.warn('R2 ListObjects error (bucket may be empty or misconfigured):', err);
        return null;
      });

      if (listResponse && listResponse.Contents) {
        for (const item of listResponse.Contents) {
          if (item.Key) {
            objects.push({
              Key: item.Key,
              Size: item.Size || 0,
              LastModified: item.LastModified,
            });
          }
        }
      }

      continuationToken = listResponse?.IsTruncated ? listResponse.NextContinuationToken : undefined;
    } while (continuationToken && objects.length < 2000);

    // 2. Query MongoDB to associate objects with emails
    const keys = objects.map(o => o.Key);
    const { db } = await connectToDatabase();

    const emails = keys.length > 0 ? await db.collection('emails').find({
      'attachments.r2Url': { $in: keys }
    }, {
      projection: {
        _id: 1,
        subject: 1,
        date: 1,
        from: 1,
        to: 1,
        folder: 1,
        attachments: 1
      }
    }).toArray() : [];

    // Build lookup map: r2Url -> email and attachment info
    const metaMap = new Map<string, any>();
    for (const email of emails) {
      if (email.attachments && Array.isArray(email.attachments)) {
        for (const att of email.attachments) {
          if (att.r2Url) {
            metaMap.set(att.r2Url, {
              emailId: email._id.toString(),
              emailSubject: email.subject || '(Sin Asunto)',
              emailDate: email.date,
              from: email.from?.address || '',
              fromName: email.from?.name || '',
              to: Array.isArray(email.to) ? email.to.map((t: any) => t.address || t).join(', ') : '',
              folder: email.folder || 'inbox',
              filename: att.filename || '',
              contentType: att.contentType || 'application/octet-stream',
              size: att.size || 0
            });
          }
        }
      }
    }

    // 3. Combine and enrich file items
    let files = objects.map(obj => {
      const meta = metaMap.get(obj.Key);
      const filename = meta?.filename || obj.Key.split('-').slice(1).join('-') || obj.Key;
      const contentType = meta?.contentType || 'application/octet-stream';
      const fileCategory = detectCategory(filename, contentType);

      return {
        key: obj.Key,
        filename,
        size: obj.Size || meta?.size || 0,
        lastModified: obj.LastModified || meta?.emailDate || new Date(),
        contentType,
        category: fileCategory,
        isOrphan: !meta,
        emailId: meta?.emailId || null,
        emailSubject: meta?.emailSubject || null,
        from: meta?.from || null,
        fromName: meta?.fromName || null,
        to: meta?.to || null,
        folder: meta?.folder || null
      };
    });

    // 4. Calculate global stats before filters
    const totalFiles = files.length;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    const orphanCount = files.filter(f => f.isOrphan).length;

    // 5. Apply filters
    if (category !== 'all') {
      if (category === 'orphan') {
        files = files.filter(f => f.isOrphan);
      } else {
        files = files.filter(f => f.category === category);
      }
    }

    if (mailbox) {
      files = files.filter(f =>
        (f.from && f.from.toLowerCase().includes(mailbox)) ||
        (f.to && f.to.toLowerCase().includes(mailbox))
      );
    }

    if (search) {
      files = files.filter(f =>
        f.filename.toLowerCase().includes(search) ||
        f.key.toLowerCase().includes(search) ||
        (f.emailSubject && f.emailSubject.toLowerCase().includes(search)) ||
        (f.from && f.from.toLowerCase().includes(search))
      );
    }

    // 6. Sort
    files.sort((a, b) => {
      if (sortBy === 'size') {
        return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
      }
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.filename.localeCompare(b.filename) : b.filename.localeCompare(a.filename);
      }
      // default: date
      const dateA = new Date(a.lastModified).getTime();
      const dateB = new Date(b.lastModified).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return NextResponse.json({
      files,
      stats: {
        totalFiles,
        totalBytes,
        totalMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
        orphanCount,
        filteredCount: files.length
      }
    });
  } catch (error) {
    console.error('Error fetching admin files:', error);
    return NextResponse.json({ error: 'Error al listar los archivos de R2' }, { status: 500 });
  }
}

// DELETE: Delete files from R2 and remove from email attachments
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const keys: string[] = Array.isArray(body.keys)
      ? body.keys.filter((k: any) => typeof k === 'string' && k.trim())
      : typeof body.key === 'string' && body.key.trim()
      ? [body.key.trim()]
      : [];

    if (keys.length === 0) {
      return NextResponse.json({ error: 'Debes proporcionar al menos una clave de archivo para eliminar' }, { status: 400 });
    }

    // 1. Delete from Cloudflare R2
    await deleteR2Objects(keys);

    // 2. Remove references from MongoDB emails collection
    const { db } = await connectToDatabase();
    const updateResult = await db.collection('emails').updateMany(
      { 'attachments.r2Url': { $in: keys } },
      { $pull: { attachments: { r2Url: { $in: keys } } as any } }
    );

    return NextResponse.json({
      success: true,
      deletedKeysCount: keys.length,
      emailsUpdatedCount: updateResult.modifiedCount,
      message: `Se eliminaron ${keys.length} archivo(s) de Cloudflare R2 y se actualizaron ${updateResult.modifiedCount} correos.`
    });
  } catch (error) {
    console.error('Error deleting admin files:', error);
    return NextResponse.json({ error: 'Error al eliminar archivos de R2' }, { status: 500 });
  }
}
