import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Vérification optimiste uniquement : sans cookie de session, inutile de
// rendre une page protégée. Le contrôle réel (session valide + rôle relu en
// base) est fait dans chaque page et chaque Server Action.
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/connexion", request.url);
  url.searchParams.set("suivant", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/panier", "/commande", "/commandes/:path*", "/vendeur/:path*", "/admin/:path*"],
};
