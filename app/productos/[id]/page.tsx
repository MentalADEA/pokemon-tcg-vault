'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function DetalleProductoPage() {
  const params = useParams();
  const id = params?.id as string;
  const [added, setAdded] = useState(false);

  // Base de datos simulada
  const catalogData: Record<string, { name: string; price: string; category: string; desc: string; img: string; condition: string }> = {
    "1": {
      name: "Carta Rara 1",
      price: "$120.00",
      category: "Singles",
      desc: "Carta para coleccionar. Buen estado físico.", // ERROR CRO/SEO: Descripción pobre sin detalles técnicos (Centrado, PSA candidate, Near Mint, etc.)
      condition: "Usado / Como nueva",
      img: "https://images.pokemontcg.io/sv3pt5/199_hires.png"
    },
    "2": {
      name: "Caja Sellada",
      price: "$65.00",
      category: "Sellados",
      desc: "Caja sellada original de fábrica de expansión reciente.",
      condition: "Nueva sellada",
      img: "https://images.pokemontcg.io/sv3pt5/logo.png"
    },
    "3": {
      name: "Carpeta de Colección",
      price: "$25.00",
      category: "Accesorios",
      desc: "Álbum para guardar tus cartas de colección con bolsillos.",
      condition: "Nueva",
      img: "https://images.pokemontcg.io/sv1/logo.png"
    }
  };

  const product = catalogData[id] || {
    name: "Producto de Colección",
    price: "$50.00",
    category: "General",
    desc: "Artículo de colección disponible para envío.",
    condition: "Buen estado",
    img: "https://images.pokemontcg.io/sv3pt5/199_hires.png"
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* ERROR SEO: Sin migas de pan (Breadcrumbs) ni marcado Schema.org de Product */}
      <Link href="/productos" className="text-xs text-slate-400 hover:text-white mb-6 inline-block">
        ← Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-slate-800 p-8 rounded-2xl border border-slate-700">
        <div className="bg-slate-950 rounded-xl p-6 flex items-center justify-center min-h-[320px]">
          <img src={product.img} alt="foto del producto" className="max-h-72 object-contain" />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">{product.category}</span>
            <h1 className="text-3xl font-extrabold text-white mt-1 mb-2">{product.name}</h1>
            <p className="text-2xl font-bold text-amber-400 mb-4">{product.price}</p>
            
            <div className="border-t border-b border-slate-700 py-3 my-4 space-y-1 text-sm text-slate-300">
              <p><span className="text-slate-400">Estado:</span> {product.condition}</p>
              <p><span className="text-slate-400">Disponibilidad:</span> En stock para envío</p>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              {product.desc}
            </p>
          </div>

          {/* BOTÓN DE ACCIÓN / ERROR CRO: Sin políticas claras de envío, sin garantía de autenticidad */}
          <div>
            <button
              onClick={() => setAdded(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg transition"
            >
              {added ? "✓ Añadido al carrito" : "Comprar"}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Pago con tarjeta o transferencia. Envíos por coordinar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}