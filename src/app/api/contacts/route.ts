import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const userEmail = auth.email;

    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 });
    }

    const assignedAddresses: string[] = (user.assignedAddresses || []).map((a: string) => a.toLowerCase().trim());
    const isWildcard = assignedAddresses.includes('*');
    const selfSet = new Set<string>([userEmail, ...assignedAddresses]);

    // 1. Cuentas de usuarios registradas en el sistema
    const registeredUsers = await db.collection('users')
      .find({}, { projection: { email: 1, name: 1, picture: 1, role: 1 } })
      .toArray();

    // 2. Contactos guardados manualmente por el usuario
    const savedContacts = await db.collection('contacts')
      .find({
        $or: [
          { ownerEmail: userEmail },
          { ownerEmail: { $exists: false } },
        ]
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // 3. Contactos extraídos de emails previos (enviados y recibidos)
    const matchQuery: Record<string, any> = {
      folder: { $nin: ['trash', 'spam'] }
    };

    if (!isWildcard) {
      matchQuery.$or = [
        { 'from.address': { $in: assignedAddresses } },
        { to: { $in: assignedAddresses } },
        { 'to.address': { $in: assignedAddresses } },
        { cc: { $in: assignedAddresses } },
        { bcc: { $in: assignedAddresses } },
      ];
    }

    const recentEmails = await db.collection('emails')
      .find(matchQuery, {
        projection: {
          from: 1,
          to: 1,
          cc: 1,
          bcc: 1,
          date: 1
        }
      })
      .sort({ date: -1 })
      .limit(600)
      .toArray();

    interface ContactEntry {
      _id?: string;
      email: string;
      name: string;
      phone?: string;
      company?: string;
      notes?: string;
      picture?: string;
      role?: string;
      source: 'registered' | 'saved' | 'interaction';
      isRegistered?: boolean;
      starred?: boolean;
      interactionCount: number;
      lastInteraction?: string;
    }

    const contactMap = new Map<string, ContactEntry>();

    // Inicializar con cuentas registradas
    for (const u of registeredUsers) {
      if (!u.email) continue;
      const cleanEmail = u.email.trim().toLowerCase();
      if (!cleanEmail || cleanEmail === userEmail) continue;

      contactMap.set(cleanEmail, {
        email: cleanEmail,
        name: u.name || cleanEmail.split('@')[0],
        picture: u.picture,
        role: u.role,
        source: 'registered',
        isRegistered: true,
        starred: false,
        interactionCount: 0,
      });
    }

    // Fusionar contactos guardados manualmente
    for (const sc of savedContacts) {
      if (!sc.email) continue;
      const cleanEmail = sc.email.trim().toLowerCase();
      if (!cleanEmail) continue;

      const existing = contactMap.get(cleanEmail);
      contactMap.set(cleanEmail, {
        _id: sc._id.toString(),
        email: cleanEmail,
        name: sc.name || existing?.name || cleanEmail.split('@')[0],
        phone: sc.phone || '',
        company: sc.company || '',
        notes: sc.notes || '',
        picture: existing?.picture,
        role: existing?.role,
        source: 'saved',
        isRegistered: !!existing?.isRegistered,
        starred: !!sc.starred,
        interactionCount: existing?.interactionCount || 0,
      });
    }

    // Extraer y enriquecer con emails previos
    const processAddress = (addr: string, nameCandidate?: string, dateCandidate?: string | Date) => {
      if (!addr || typeof addr !== 'string') return;
      const cleanEmail = addr.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || selfSet.has(cleanEmail)) return;

      const dateStr = dateCandidate ? new Date(dateCandidate).toISOString() : undefined;
      const existing = contactMap.get(cleanEmail);

      if (existing) {
        existing.interactionCount += 1;
        if (!existing.lastInteraction || (dateStr && dateStr > existing.lastInteraction)) {
          existing.lastInteraction = dateStr;
        }
        if (!existing.name && nameCandidate && nameCandidate.trim() !== cleanEmail) {
          existing.name = nameCandidate.trim();
        }
      } else {
        const fallbackName = (nameCandidate && nameCandidate.trim() !== cleanEmail)
          ? nameCandidate.trim()
          : cleanEmail.split('@')[0];

        contactMap.set(cleanEmail, {
          email: cleanEmail,
          name: fallbackName,
          source: 'interaction',
          isRegistered: false,
          starred: false,
          interactionCount: 1,
          lastInteraction: dateStr,
        });
      }
    };

    for (const email of recentEmails) {
      const emailDate = email.date;
      if (email.from?.address) {
        processAddress(email.from.address, email.from.name, emailDate);
      }
      if (Array.isArray(email.to)) {
        for (const t of email.to) {
          if (typeof t === 'string') processAddress(t, undefined, emailDate);
          else if (t?.address) processAddress(t.address, t.name, emailDate);
        }
      }
      if (Array.isArray(email.cc)) {
        for (const c of email.cc) {
          if (typeof c === 'string') processAddress(c, undefined, emailDate);
          else if (c?.address) processAddress(c.address, c.name, emailDate);
        }
      }
      if (Array.isArray(email.bcc)) {
        for (const b of email.bcc) {
          if (typeof b === 'string') processAddress(b, undefined, emailDate);
          else if (b?.address) processAddress(b.address, b.name, emailDate);
        }
      }
    }

    const contacts = Array.from(contactMap.values()).sort((a, b) => {
      // 1. Favoritos primero
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;

      // 2. Mayor frecuencia de interacción
      if (b.interactionCount !== a.interactionCount) {
        return b.interactionCount - a.interactionCount;
      }

      // 3. Usuarios registrados y guardados antes que simples descubiertos
      const weight = (s: string) => (s === 'saved' ? 3 : s === 'registered' ? 2 : 1);
      if (weight(b.source) !== weight(a.source)) {
        return weight(b.source) - weight(a.source);
      }

      // 4. Alfabético por nombre
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

    return NextResponse.json({ contacts, count: contacts.length });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Error al obtener contactos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, company, notes, starred } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

    const { db } = await connectToDatabase();

    const doc = {
      ownerEmail: auth.email,
      name: cleanName,
      email: cleanEmail,
      phone: (phone || '').trim(),
      company: (company || '').trim(),
      notes: (notes || '').trim(),
      starred: !!starred,
      updatedAt: new Date(),
    };

    const res = await db.collection('contacts').updateOne(
      { ownerEmail: auth.email, email: cleanEmail },
      {
        $set: doc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Contacto guardado correctamente',
      contact: { ...doc, _id: res.upsertedId ? res.upsertedId.toString() : undefined }
    });
  } catch (error) {
    console.error('Error saving contact:', error);
    return NextResponse.json({ error: 'Error al guardar contacto' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, email, name, phone, company, notes, starred } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

    const { db } = await connectToDatabase();

    const updateDoc: Record<string, any> = {
      name: cleanName,
      email: cleanEmail,
      updatedAt: new Date(),
    };

    if (phone !== undefined) updateDoc.phone = (phone || '').trim();
    if (company !== undefined) updateDoc.company = (company || '').trim();
    if (notes !== undefined) updateDoc.notes = (notes || '').trim();
    if (starred !== undefined) updateDoc.starred = !!starred;

    let query: Record<string, any> = { ownerEmail: auth.email, email: cleanEmail };
    if (id && ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id), ownerEmail: auth.email };
    }

    await db.collection('contacts').updateOne(
      query,
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: new Date(), ownerEmail: auth.email }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: 'Contacto actualizado' });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Error al actualizar contacto' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json({ error: 'Identificador requerido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    let query: Record<string, any> = { ownerEmail: auth.email };

    if (id && ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else if (email) {
      query.email = email.trim().toLowerCase();
    }

    const res = await db.collection('contacts').deleteOne(query);

    return NextResponse.json({
      success: true,
      deletedCount: res.deletedCount,
      message: 'Contacto eliminado'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Error al eliminar contacto' }, { status: 500 });
  }
}
