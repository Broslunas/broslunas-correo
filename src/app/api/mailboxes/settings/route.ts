import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to authenticate session and check if the user is authorized to manage the requested email
async function verifyUserAndMailbox(request: NextRequest, targetEmail: string) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userEmail = (payload.email as string || '').trim().toLowerCase();

    if (!userEmail) {
      return { authorized: false, errorResponse: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) };
    }

    const { db } = await connectToDatabase();
    
    // Find the user to retrieve their permissions
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return { authorized: false, errorResponse: NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 }) };
    }

    const assignedAddresses: string[] = user.assignedAddresses || [];
    const cleanTargetEmail = targetEmail.trim().toLowerCase();

    if (!assignedAddresses.includes('*') && !assignedAddresses.includes(cleanTargetEmail)) {
      return { 
        authorized: false, 
        errorResponse: NextResponse.json({ 
          error: `No tienes permisos para administrar la cuenta: ${cleanTargetEmail}` 
        }, { status: 403 }) 
      };
    }

    return { authorized: true, userEmail, db, cleanTargetEmail };
  } catch (err) {
    console.error('Auth verification error in mailbox settings:', err);
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 }) };
  }
}

// GET: Retrieve settings for a specific mailbox
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'El parámetro email es obligatorio' }, { status: 400 });
    }

    const verification = await verifyUserAndMailbox(request, email);
    if (!verification.authorized || !verification.db || !verification.cleanTargetEmail) {
      return verification.errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { db, cleanTargetEmail } = verification;

    const mailbox = await db.collection('mailboxes').findOne({ email: cleanTargetEmail });
    if (!mailbox) {
      return NextResponse.json({ error: 'La cuenta de correo especificada no está registrada' }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        email: mailbox.email,
        autoReplyEnabled: mailbox.autoReplyEnabled ?? false,
        autoReplySubject: mailbox.autoReplySubject ?? 'Respuesta automática: {{subject}}',
        autoReplyBody: mailbox.autoReplyBody ?? 'Hola,\n\nGracias por su mensaje. Hemos recibido su correo y le responderemos lo antes posible.\n\nSaludos cordiales.',
        signature: mailbox.signature ?? '',
      }
    });
  } catch (error) {
    console.error('Error fetching mailbox settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH: Update settings for a specific mailbox
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, autoReplyEnabled, autoReplySubject, autoReplyBody, signature } = body;

    if (!email) {
      return NextResponse.json({ error: 'La dirección de correo (email) es obligatoria' }, { status: 400 });
    }

    const verification = await verifyUserAndMailbox(request, email);
    if (!verification.authorized || !verification.db || !verification.cleanTargetEmail) {
      return verification.errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { db, cleanTargetEmail } = verification;

    // Check if the mailbox exists
    const mailbox = await db.collection('mailboxes').findOne({ email: cleanTargetEmail });
    if (!mailbox) {
      return NextResponse.json({ error: 'La cuenta de correo especificada no existe en el sistema' }, { status: 404 });
    }

    // Prepare update object
    const updateFields: Record<string, any> = {};
    if (autoReplyEnabled !== undefined) updateFields.autoReplyEnabled = Boolean(autoReplyEnabled);
    if (autoReplySubject !== undefined) updateFields.autoReplySubject = String(autoReplySubject).trim();
    if (autoReplyBody !== undefined) updateFields.autoReplyBody = String(autoReplyBody);
    if (signature !== undefined) updateFields.signature = String(signature);

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No se especificaron campos para actualizar' }, { status: 400 });
    }

    await db.collection('mailboxes').updateOne(
      { email: cleanTargetEmail },
      { $set: updateFields }
    );

    // Send email notification of modified settings
    const modifiedFields: string[] = [];
    if (autoReplyEnabled !== undefined) modifiedFields.push('Estado de respuesta automática');
    if (autoReplySubject !== undefined || autoReplyBody !== undefined) modifiedFields.push('Plantilla de respuesta automática');
    if (signature !== undefined) modifiedFields.push('Firma de correo');

    if (modifiedFields.length > 0 && verification.userEmail) {
      try {
        const { sendSettingsChangedEmail } = await import('@/lib/mailjet');
        sendSettingsChangedEmail(verification.userEmail, verification.userEmail.split('@')[0], modifiedFields)
          .catch(err => console.error('Failed to send settings change notification:', err));
      } catch (err) {
        console.error('Error triggering settings change notification:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente'
    });
  } catch (error) {
    console.error('Error updating mailbox settings:', error);
    return NextResponse.json({ error: 'Error interno al actualizar la configuración' }, { status: 500 });
  }
}
