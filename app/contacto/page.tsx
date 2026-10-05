'use client';

import React, { useState } from 'react';

export default function ContactoPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      {/* ERROR SEO/SEM: No tiene información de ubicación local, sin mapa de Google, sin microformatos de negocio local */}
      <h1 className="text-3xl font-extrabold text-white mb-2">Contacto</h1>
      <p className="text-slate-400 text-sm mb-8">
        Escríbenos si tienes dudas o buscas alguna carta en específico.
      </p>

      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
        {sent ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-bold text-amber-400 mb-2">¡Mensaje enviado!</h2>
            <p className="text-slate-300 text-sm">Te responderemos a la brevedad por correo electrónico.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Mensaje</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                placeholder="¿Qué carta o producto estás buscando?"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg transition text-sm"
            >
              Enviar mensaje
            </button>
          </form>
        )}
      </div>
    </div>
  );
}