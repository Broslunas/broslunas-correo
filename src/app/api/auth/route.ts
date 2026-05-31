import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
      
      // Clear permanent session cookie
      response.cookies.set('webmail_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      // Clear temporary session cookie
      response.cookies.set('webmail_temp_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      return response;
    }

    return NextResponse.json({ error: 'Acción no permitida' }, { status: 400 });
  } catch (error) {
    console.error('Error in Auth API Route:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
