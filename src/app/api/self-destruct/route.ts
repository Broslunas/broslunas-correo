import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const reveal = searchParams.get('reveal') === 'true';

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token de acceso no proporcionado' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const record = await db.collection('self_destruct_emails').findOne({ token });

    if (!record) {
      return NextResponse.json(
        { error: 'El mensaje no existe o ha sido purgado permanentemente.' },
        { status: 404 }
      );
    }

    // Check expiration
    const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
    if (isExpired) {
      if (!record.isBurned) {
        // Never delete or wipe data in MongoDB; only mark status flags
        await db.collection('self_destruct_emails').updateOne(
          { _id: record._id },
          {
            $set: {
              isBurned: true,
              burnedAt: new Date(),
            },
          }
        );
      }
      return NextResponse.json({
        isBurned: true,
        isExpired: true,
        from: { name: record.senderName, address: record.senderEmail },
        subject: record.subject,
      });
    }

    // Check if already burned
    if (record.isBurned) {
      return NextResponse.json({
        isBurned: true,
        isExpired: false,
        from: { name: record.senderName, address: record.senderEmail },
        subject: record.subject,
      });
    }

    // If reveal is false, return metadata for the warning confirmation screen
    if (!reveal) {
      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        from: { name: record.senderName, address: record.senderEmail },
        to: record.recipients,
        subject: record.subject,
        date: record.createdAt,
        maxViews: record.maxViews,
        viewCount: record.viewCount || 0,
        expiresAt: record.expiresAt,
        hasAttachments: Array.isArray(record.attachments) && record.attachments.length > 0,
        attachmentCount: Array.isArray(record.attachments) ? record.attachments.length : 0,
      });
    }

    // User confirmed warning: reveal content and increment view count
    const nextViewCount = (record.viewCount || 0) + 1;
    const isOverViews = typeof record.maxViews === 'number' && nextViewCount >= record.maxViews;

    if (isOverViews) {
      // Never delete or wipe data in MongoDB; only mark status flags
      await db.collection('self_destruct_emails').updateOne(
        { _id: record._id },
        {
          $set: {
            viewCount: nextViewCount,
            isBurned: true,
            burnedAt: new Date(),
          },
        }
      );
    } else {
      await db.collection('self_destruct_emails').updateOne(
        { _id: record._id },
        { $inc: { viewCount: 1 } }
      );
    }

    return NextResponse.json({
      success: true,
      from: { name: record.senderName, address: record.senderEmail },
      to: record.recipients,
      cc: record.cc,
      subject: record.subject,
      date: record.createdAt,
      body: {
        text: record.bodyText,
        html: record.bodyHtml,
      },
      attachments: record.attachments || [],
      viewCount: nextViewCount,
      maxViews: record.maxViews,
      expiresAt: record.expiresAt,
      isBurnedNow: !!isOverViews,
    });
  } catch (error: any) {
    console.error('Error fetching self-destruct email:', error);
    return NextResponse.json({ error: 'Error al consultar el mensaje autodestructible' }, { status: 500 });
  }
}
