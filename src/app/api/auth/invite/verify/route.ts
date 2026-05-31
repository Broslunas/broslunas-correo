import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Falta el token de invitación' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const invitation = await db.collection('invitations').findOne({ token });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no válida o no encontrada' }, { status: 404 });
    }

    if (invitation.used) {
      return NextResponse.json({ error: 'Esta invitación ya ha sido utilizada' }, { status: 400 });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: 'Esta invitación ha expirado' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        role: invitation.role,
        assignedAddresses: invitation.assignedAddresses,
        require2FA: invitation.require2FA,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json({ error: 'Error interno al verificar la invitación' }, { status: 500 });
  }
}
