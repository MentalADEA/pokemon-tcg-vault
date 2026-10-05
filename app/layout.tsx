import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// ERROR SEO: Metadata genérica y sin palabras clave de compra/coleccionismo
export const metadata: Metadata = {
  title: "Inicio - PokeStore",
  description: "Web de cartas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans antialiased">
        {/* HEADER / NAVBAR GLOBAL */}
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold tracking-tight text-amber-400">
              PokeStore
            </Link>
            <nav className="space-x-6 text-sm text-slate-300">
              <Link href="/" className="hover:text-white transition">Inicio</Link>
              <Link href="/productos" className="hover:text-white transition">Catálogo</Link>
              <Link href="/contacto" className="hover:text-white transition">Contacto</Link>
            </nav>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1">
          {children}
        </main>

        {/* FOOTER GLOBAL */}
        <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8 text-center text-xs text-slate-500">
          <p>© 2026 PokeStore. Tienda de cartas coleccionables. Todos los derechos reservados.</p>
        </footer>
      </body>
    </html>
  );
}