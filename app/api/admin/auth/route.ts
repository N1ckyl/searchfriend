import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPin, generateAdminToken, isRequestAuthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || !verifyAdminPin(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN de Administrador incorrecto.' },
        { status: 401 }
      );
    }

    const token = generateAdminToken();

    const response = NextResponse.json({
      success: true,
      message: 'Autenticación exitosa',
      token,
    });

    response.cookies.set({
      name: 'sf_admin_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error de autenticación' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authorized = isRequestAuthorized(req);
  return NextResponse.json({ authenticated: authorized });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
  response.cookies.delete('sf_admin_token');
  return response;
}
