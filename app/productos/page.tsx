'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ProductosPage() {
  const [filter, setFilter] = useState('Todos');

  // Catálogo completo sin optimización semántica de palabras clave transaccionales
  const allProducts = [
    {
      id: "1",
      name: "Carta Rara 1",
      category: "Singles",
      price: "$120.00",
      stock: "Disponible",
      img: "https://images.pokemontcg.io/sv3pt5/199_hires.png"
    },
    {
      id: "2",
      name: "Caja Sellada",
      category: "Sellados",
      price: "$65.00",
      stock: "Pocas unidades",
      img: "https://images.pokemontcg.io/sv3pt5/logo.png"
    },
    {
      id: "3",
      name: "Carpeta de Colección",
      category: "Accesorios",
      price: "$25.00",
      stock: "Disponible",
      img: "https://images.pokemontcg.io/sv1/logo.png"
    },
    {
      id: "4",
      name: "Carta Antigua",
      category: "Singles",
      price: "$45.00",
      stock: "Agotado",
      img: "https://images.pokemontcg.io/base1/4_hires.png"
    },
    {
      id: "5",
      name: "Paquete de Fundas",
      category: "Accesorios",
      price: "$12.00",
      stock: "Disponible",
      img: "https://images.pokemontcg.io/swsh1/logo.png"
    },
    {
      id: "6",
      name: "Lote de Cartas Variadas",
      category: "Sellados",
      price: "$30.00",
      stock: "Disponible",
      img: "https://images.pokemontcg.io/sv2/logo.png"
    }
  ];

  const filtered = filter === 'Todos' 
    ? allProducts 
    : allProducts.filter(p => p.category === filter);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* ERROR SEO: H1 poco descriptivo ("Catálogo") en lugar de incluir intención de compra y categoría */}
      <h1 className="text-3xl font-extrabold text-white mb-2">Catálogo</h1>
      <p className="text-slate-400 text-sm mb-8">Todos los productos disponibles en la tienda.</p>

      {/* FILTROS BÁSICOS */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {['Todos', 'Singles', 'Sellados', 'Accesorios'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === cat 
                ? 'bg-amber-500 text-slate-950' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div key={item.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col justify-between">
            <div>
              <div className="h-48 flex items-center justify-center bg-slate-950 rounded-lg mb-4 p-4 overflow-hidden">
                <img src={item.img} alt="producto" className="max-h-full object-contain" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">{item.category}</span>
              <h2 className="font-semibold text-lg text-slate-100 mt-1">{item.name}</h2>
              <span className="text-xs text-amber-500/80 font-medium">{item.stock}</span>
            </div>
            
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-700/60">
              <span className="text-xl font-bold text-amber-400">{item.price}</span>
              <Link 
                href={`/productos/${item.id}`}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                Ver más
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}