import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ensureWildDuckUser, listApplicationPasswords, createApplicationPassword, revokeApplicationPassword } from '@/lib/wildduck';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function authSession(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.email as string || '').trim().toLowerCase();
  } catch {
    return null;
  }
}

/**
 * GET /api/imap/credentials
 *
 * Returns the IMAP/SMTP connection settings + the list of application
 * passwords for the authenticated user. The frontend renders a card
 * that the user copies into Thunderbird/Outlook/Apple Mail.
 */
export async function GET(request: NextRequest) {
  const userEmail = await authSession(request);
  if (!userEmail) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ email: userEmail });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const assignedAddresses: string[] = user.assignedAddresses || [];
  const mailboxes = assignedAddresses.includes('*')
    ? await db.collection('mailboxes').find({}).toArray()
    : await db.collection('mailboxes').find({ email: { $in: assignedAddresses } }).toArray();

  // For each assigned mailbox, list its app passwords
  const accounts = await Promise.all(
    mailboxes
      .filter((m: any) => m && m.email)
      .map(async (m: any) => {
        const wdUser = await ensureWildDuckUser(m.email, m.name || m.email, '');
        const userId = wdUser?._id || wdUser?.id;
        if (!userId) {
          return { email: m.email, name: m.name || m.email, wildduckUserId: null, appPasswords: [] };
        }
        const passwords = await listApplicationPasswords(String(userId));
        return {
          email: m.email,
          name: m.name || m.email,
          wildduckUserId: String(userId),
          appPasswords: passwords.map((p: any) => ({
            id: p.id,
            description: p.description,
            created: p.created,
            // We never return the plaintext here — it was shown once at creation
          })),
        };
      })
  );

  return NextResponse.json({
    enabled: Boolean(process.env.WILDDUCK_API_URL),
    imapHost: process.env.IMAP_PUBLIC_HOST || 'mail.broslunas.com',
    imapPort: Number(process.env.IMAP_PUBLIC_PORT) || 993,
    imapSecurity: 'SSL/TLS',
    pop3Host: process.env.IMAP_PUBLIC_HOST || 'mail.broslunas.com',
    pop3Port: 995,
    pop3Security: 'SSL/TLS',
    smtpHost: process.env.IMAP_PUBLIC_HOST || 'mail.broslunas.com',
    smtpPort: 587,
    smtpSecurity: 'STARTTLS',
    authMethod: 'Application Password (per device)',
    accounts,
  });
}

/**
 * POST /api/imap/credentials
 *
 * Body: { mailbox, description }
 * Creates a new application password and returns the plaintext ONCE.
 */
export async function POST(request: NextRequest) {
  const userEmail = await authSession(request);
  if (!userEmail) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ email: userEmail });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { mailbox, description } = body as { mailbox?: string; description?: string };

  if (!mailbox || typeof mailbox !== 'string') {
    return NextResponse.json({ error: 'Falta el buzón destino' }, { status: 400 });
  }
  if (!description || description.length < 2 || description.length > 64) {
    return NextResponse.json({ error: 'Descripción inválida (2-64 caracteres)' }, { status: 400 });
  }

  // Authorization: user must have access to the mailbox
  const assignedAddresses: string[] = user.assignedAddresses || [];
  if (!assignedAddresses.includes('*') && !assignedAddresses.includes(mailbox.toLowerCase())) {
    return NextResponse.json({ error: 'No autorizado para este buzón' }, { status: 403 });
  }

  const wdUser = await ensureWildDuckUser(mailbox, mailbox, '');
  if (!wdUser?._id && !wdUser?.id) {
    return NextResponse.json({ error: 'No se pudo crear el usuario en WildDuck' }, { status: 502 });
  }
  const userId = String(wdUser._id || wdUser.id);

  const result = await createApplicationPassword(userId, description);
  if (!result) {
    return NextResponse.json({ error: 'No se pudo generar la contraseña' }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    appPassword: result.password,
    appPasswordId: result.id,
    description,
    // Reminder for the UI to show
    warning: 'Esta contraseña solo se mostrará una vez. Cópiala ahora.',
  });
}

/**
 * DELETE /api/imap/credentials?mailbox=...&id=...
 * Revokes an application password.
 */
export async function DELETE(request: NextRequest) {
  const userEmail = await authSession(request);
  if (!userEmail) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mailbox = searchParams.get('mailbox');
  const id = searchParams.get('id');
  if (!mailbox || !id) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ email: userEmail });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const assignedAddresses: string[] = user.assignedAddresses || [];
  if (!assignedAddresses.includes('*') && !assignedAddresses.includes(mailbox.toLowerCase())) {
    return NextResponse.json({ error: 'No autorizado para este buzón' }, { status: 403 });
  }

  const wdUser = await ensureWildDuckUser(mailbox, mailbox, '');
  if (!wdUser?._id && !wdUser?.id) {
    return NextResponse.json({ error: 'Buzón no encontrado en WildDuck' }, { status: 404 });
  }
  const userId = String(wdUser._id || wdUser.id);

  const ok = await revokeApplicationPassword(userId, id);
  if (!ok) {
    return NextResponse.json({ error: 'No se pudo revocar la contraseña' }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
