import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { sendEmail2FACode } from '@/lib/mailjet';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to verify temporary session token
async function getSessionUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const parts = c.trim().split('=');
    return [parts[0], parts.slice(1).join('=')];
  }));

  const tempToken = cookies['webmail_temp_session'];

  if (tempToken) {
    try {
      const { payload } = await jwtVerify(tempToken, JWT_SECRET);
      if (payload.step === '2fa_pending') {
        return { 
          email: (payload.email as string).trim().toLowerCase(), 
          name: payload.name as string || '', 
          picture: payload.picture as string || '',
          isTemp: true 
        };
      }
    } catch (err) {
      console.warn('Failed to verify temporary session JWT inside resend:', err);
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser(request);
    if (!session || !session.isTemp) {
      return NextResponse.json({ error: 'No autorizado (sesión temporal inválida o expirada)' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: session.email });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // User can request email verification code even if they have app-based 2FA enabled (as a fallback "other method")

    // Generate email code and save to DB
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    const emailExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

    await db.collection('users').updateOne(
      { email: session.email },
      {
        $set: {
          email2faCode: emailCode,
          email2faExpires: emailExpires,
          updatedAt: new Date()
        }
      }
    );

    console.log(`Resending dynamic email 2FA code to ${session.email}: ${emailCode}`);

    // Send via Mailjet
    try {
      await sendEmail2FACode(session.email, session.name || 'Usuario', emailCode);
    } catch (err) {
      console.error('Error sending 2FA email in resend API:', err);
      return NextResponse.json({ error: 'Error al enviar el correo con el código de verificación.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Código de verificación enviado correctamente a tu correo.'
    });
  } catch (error) {
    console.error('Error in 2FA Resend API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
