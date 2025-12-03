import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, AdminSession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const session = await getIronSession<AdminSession>(cookies(), sessionOptions);

    // Si el usuario no está logueado, redirige a la página de login
    if (!session.isLoggedIn) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return response;
}

// Configura el middleware para que solo se ejecute en las rutas del dashboard
export const config = {
    matcher: '/admin/dashboard/:path*',
};