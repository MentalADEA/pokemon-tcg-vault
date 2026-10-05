'use client';

import React, { useState, useEffect, useMemo } from 'react';

const POKEMON_CARD_BACK = 'https://images.pokemontcg.io/sv3pt5/back.png';

interface APISet {
  id: string;
  name: string;
  cardCount?: {
    total: number;
    official: number;
  };
}

interface APICardBrief {
  id: string;
  localId: string;
  name: string;
  image: string;
  rarity?: string;
  setId: string;
  setName: string;
  estimatedRaw: number;
  estimatedPsa10: number;
}

interface PokeApiData {
  types: string[];
  flavorText?: string;
  height?: number;
  weight?: number;
}

export default function PokeCollectrHub() {
  const [activeTab, setActiveTab] = useState<'sets' | 'binder' | 'grading' | 'wishlist'>('sets');

  // Estados de API TCGdex
  const [setsList, setSetsList] = useState<APISet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('sv03.5'); // Default: 151
  const [cardsInSet, setCardsInSet] = useState<APICardBrief[]>([]);
  const [loadingSets, setLoadingSets] = useState<boolean>(true);
  const [loadingCards, setLoadingCards] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('ALL');

  // Notificación flotante (Toast) para avisar sin cambiar de pestaña
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Binder con persistencia en LocalStorage
  const [myBinderCards, setMyBinderCards] = useState<APICardBrief[]>([]);
  const [binderFilterSet, setBinderFilterSet] = useState<string>('ALL');
  const [binderCurrentPage, setBinderCurrentPage] = useState<number>(0);

  // Wishlist con persistencia
  const [wishlist, setWishlist] = useState<APICardBrief[]>([]);

  // Simulador PSA Grading + Datos de PokéAPI
  const [cardToGrade, setCardToGrade] = useState<APICardBrief | null>(null);
  const [pokeApiDetails, setPokeApiDetails] = useState<PokeApiData | null>(null);
  const [loadingPokeApi, setLoadingPokeApi] = useState<boolean>(false);
  const [lrRatio, setLrRatio] = useState<number>(52);
  const [tbRatio, setTbRatio] = useState<number>(51);
  const [hasWhitening, setHasWhitening] = useState<boolean>(false);
  const [hasPrintLines, setHasPrintLines] = useState<boolean>(false);

  // Panel académico de Marketing
  const [showMarketingPanel, setShowMarketingPanel] = useState<boolean>(false);

  // 1. CARGA INICIAL DESDE LOCALSTORAGE
  useEffect(() => {
    try {
      const savedBinder = localStorage.getItem('pokevault_binder');
      if (savedBinder) setMyBinderCards(JSON.parse(savedBinder));

      const savedWishlist = localStorage.getItem('pokevault_wishlist');
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, []);

  // Guardar automáticamente cambios
  useEffect(() => {
    try {
      localStorage.setItem('pokevault_binder', JSON.stringify(myBinderCards));
    } catch (e) {
      console.warn(e);
    }
  }, [myBinderCards]);

  useEffect(() => {
    try {
      localStorage.setItem('pokevault_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.warn(e);
    }
  }, [wishlist]);

  // Temporizador para esconder el toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 2. OBTENER LISTA DE COLECCIONES OFICIALES
  useEffect(() => {
    async function fetchSets() {
      try {
        setLoadingSets(true);
        const res = await fetch('https://api.tcgdex.net/v2/en/sets');
        if (!res.ok) throw new Error('Error al conectar con sets');
        const data: APISet[] = await res.json();
        setSetsList([...data].reverse());
      } catch (err) {
        console.error('Error cargando sets:', err);
      } finally {
        setLoadingSets(false);
      }
    }
    fetchSets();
  }, []);

  // 3. CARGAR CARTAS DEL SET SELECCIONADO
  useEffect(() => {
    if (!selectedSetId) return;

    async function fetchCardsOfSet() {
      try {
        setLoadingCards(true);
        const res = await fetch(`https://api.tcgdex.net/v2/en/sets/${selectedSetId}`);
        if (!res.ok) throw new Error('Error al cargar cartas');
        const data = await res.json();
        const setName = data.name || 'Expansion';

        const mappedCards: APICardBrief[] = (data.cards || []).map((c: any, index: number) => {
          const rarity = c.rarity || 'Common';
          let raw = 1.50;
          let psa = 18.00;
          const lowerName = c.name.toLowerCase();

          if (lowerName.includes('charizard') || lowerName.includes('mew') || lowerName.includes('gengar')) {
            raw = 65.00 + (index % 50);
            psa = raw * 2.8;
          } else if (rarity.includes('Special') || rarity.includes('Secret') || rarity.includes('Illustration')) {
            raw = 45.00 + (index % 30);
            psa = raw * 2.5;
          } else if (rarity.includes('Ultra') || rarity.includes('ex') || rarity.includes('VSTAR')) {
            raw = 12.00 + (index % 10);
            psa = raw * 2.2;
          } else if (rarity.includes('Holo')) {
            raw = 3.50;
            psa = 24.00;
          }

          return {
            id: c.id,
            localId: c.localId,
            name: c.name,
            rarity: rarity,
            setId: selectedSetId,
            setName: setName,
            image: c.image ? `${c.image}/low.webp` : POKEMON_CARD_BACK,
            estimatedRaw: Number(raw.toFixed(2)),
            estimatedPsa10: Number(psa.toFixed(2))
          };
        });

        setCardsInSet(mappedCards);

        if (mappedCards.length > 0 && !cardToGrade) {
          setCardToGrade(mappedCards[0]);
        }
      } catch (err) {
        console.error('Error cargando cartas del set:', err);
      } finally {
        setLoadingCards(false);
      }
    }

    fetchCardsOfSet();
  }, [selectedSetId]);

  // 4. NUEVA API: PokéAPI para información de especie cuando seleccionas una carta
  useEffect(() => {
    if (!cardToGrade) return;

    async function fetchPokeApi() {
      try {
        setLoadingPokeApi(true);
        // Extraer el nombre base del Pokémon (ej: "Charizard ex" -> "charizard")
        const baseName = cardToGrade!.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${baseName}`);
        if (!res.ok) {
          setPokeApiDetails(null);
          return;
        }
        const data = await res.json();
        const types = data.types.map((t: any) => t.type.name);

        // Fetch flavor text en español si está disponible
        const speciesRes = await fetch(data.species.url);
        let flavor = '';
        if (speciesRes.ok) {
          const specData = await speciesRes.json();
          const esEntry = specData.flavor_text_entries.find((f: any) => f.language.name === 'es') ||
                          specData.flavor_text_entries.find((f: any) => f.language.name === 'en');
          flavor = esEntry ? esEntry.flavor_text.replace(/[\n\f]/g, ' ') : '';
        }

        setPokeApiDetails({
          types,
          flavorText: flavor,
          height: data.height / 10,
          weight: data.weight / 10
        });
      } catch (e) {
        setPokeApiDetails(null);
      } finally {
        setLoadingPokeApi(false);
      }
    }

    fetchPokeApi();
  }, [cardToGrade]);

  // Lista de rarezas disponibles en el set actual para el filtro
  const availableRarities = useMemo(() => {
    const setRar = new Set<string>();
    cardsInSet.forEach(c => { if (c.rarity) setRar.add(c.rarity); });
    return Array.from(setRar);
  }, [cardsInSet]);

  // Filtro compuesto de catálogo
  const filteredCatalogCards = useMemo(() => {
    return cardsInSet.filter((c) => {
      const matchText = c.name.toLowerCase().includes(searchFilter.toLowerCase()) || c.localId.includes(searchFilter);
      const matchRarity = rarityFilter === 'ALL' || c.rarity === rarityFilter;
      return matchText && matchRarity;
    });
  }, [cardsInSet, searchFilter, rarityFilter]);

  // Parsear correlativo numérico (#1, #2, #150...)
  const parseCardNumber = (str: string): number => {
    const numericPart = str.replace(/\D/g, '');
    return numericPart ? parseInt(numericPart, 10) : 999999;
  };

  // Cartas del Binder ordenadas numéricamente
  const sortedBinderCards = useMemo(() => {
    let list = [...myBinderCards];
    if (binderFilterSet !== 'ALL') {
      list = list.filter((c) => c.setId === binderFilterSet);
    }
    list.sort((a, b) => {
      const numA = parseCardNumber(a.localId);
      const numB = parseCardNumber(b.localId);
      if (numA !== numB) return numA - numB;
      return a.localId.localeCompare(b.localId);
    });
    return list;
  }, [myBinderCards, binderFilterSet]);

  const totalBinderPages = Math.max(1, Math.ceil(sortedBinderCards.length / 9));
  const displayedPageCards = useMemo(() => {
    const start = binderCurrentPage * 9;
    const slice = sortedBinderCards.slice(start, start + 9);
    const slots: (APICardBrief | null)[] = Array(9).fill(null);
    slice.forEach((card, idx) => {
      slots[idx] = card;
    });
    return slots;
  }, [sortedBinderCards, binderCurrentPage]);

  const availableSetsInBinder = useMemo(() => {
    const map = new Map<string, string>();
    myBinderCards.forEach((c) => {
      if (!map.has(c.setId)) map.set(c.setId, c.setName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [myBinderCards]);

  // AÑADIR AL BINDER SIN SALTAR DE PESTAÑA (Permite seguir agregando)
  const addCardToBinder = (card: APICardBrief) => {
    const exists = myBinderCards.some((c) => c.id === card.id);
    if (exists) {
      setToastMessage(`⚠️ "${card.name} (#${card.localId})" ya estaba en tu Binder.`);
      return;
    }
    setMyBinderCards([...myBinderCards, card]);
    setToastMessage(`✅ Carta #${card.localId} (${card.name}) agregada al Binder`);
    // NO ejecutamos setActiveTab('binder') para que puedas seguir agregando cartas sin pausa
  };

  const removeCardFromBinder = (cardId: string) => {
    setMyBinderCards(myBinderCards.filter((c) => c.id !== cardId));
  };

  const toggleWishlist = (card: APICardBrief) => {
    if (wishlist.some((w) => w.id === card.id)) {
      setWishlist(wishlist.filter((w) => w.id !== card.id));
      setToastMessage(`Removida de Wishlist: ${card.name}`);
    } else {
      setWishlist([...wishlist, card]);
      setToastMessage(`❤️ Añadida a Wishlist: ${card.name}`);
    }
  };

  // Exportar reporte de colección al portapapeles
  const handleExportSummary = () => {
    const lines = [
      `=== REPORTE DE COLECCIÓN POKÉCOLLECTR ===`,
      `Colección filtrada: ${binderFilterSet === 'ALL' ? 'Todas' : binderFilterSet}`,
      `Total de cartas en Binder: ${sortedBinderCards.length}`,
      `Valor estimado total: $${totalBinderValue.toFixed(2)} USD`,
      `-----------------------------------------`,
      ...sortedBinderCards.map(c => `#${c.localId} - ${c.name} (${c.rarity}) -> $${c.estimatedRaw} USD`)
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setToastMessage(`📋 ¡Resumen copiado al portapapeles! Listo para pegar en WhatsApp o Excel.`);
  };

  const totalBinderValue = sortedBinderCards.reduce((acc, c) => acc + c.estimatedRaw, 0);
  const totalWishlistValue = wishlist.reduce((acc, c) => acc + c.estimatedRaw, 0);

  const gradingVerdict = useMemo(() => {
    if (hasPrintLines || hasWhitening) {
      return { grade: 'PSA 8 (Near Mint-Mint)', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', multiplier: 1.2 };
    }
    const lrDelta = Math.abs(50 - lrRatio);
    const tbDelta = Math.abs(50 - tbRatio);

    if (lrDelta <= 5 && tbDelta <= 5) {
      return { grade: 'PSA 10 (Gem Mint Candidata)', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', multiplier: 2.6 };
    }
    if (lrDelta <= 10 && tbDelta <= 10) {
      return { grade: 'PSA 9 (Mint)', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', multiplier: 1.6 };
    }
    return { grade: 'PSA 7 - 8 (Near Mint)', badge: 'bg-slate-700 text-slate-300 border-slate-600', multiplier: 1.0 };
  }, [lrRatio, tbRatio, hasWhitening, hasPrintLines]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      
      {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-400 animate-bounce">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-900 hover:text-black text-xs font-black">
            ✕
          </button>
        </div>
      )}

      {/* BARRA SUPERIOR ACADÉMICA */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-bold flex justify-between items-center shadow-md">
        <span>🎓 Caso de Estudio Marketing Digital: Collector Hub, SEO Semántico, Multi-APIs y CRO</span>
        <button
          onClick={() => setShowMarketingPanel(!showMarketingPanel)}
          className="bg-slate-950 text-amber-400 px-3 py-1 rounded hover:bg-slate-900 transition flex items-center gap-1 shadow"
        >
          {showMarketingPanel ? '✖ Ocultar Auditoría' : '📊 Ver Auditoría SEO / SEM / CRO'}
        </button>
      </div>

      {/* PANEL AUDITORÍA DE MARKETING */}
      {showMarketingPanel && (
        <aside className="bg-slate-900 border-b border-amber-500/30 p-6 text-sm text-slate-300">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-amber-400 font-bold mb-2">1. Estrategia SEO On-Page (Multi-API)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Indexación de Entidades Pokédex:</strong> Cruzar datos con PokéAPI permite generar metadatos de especies y tipos elementales, respondiendo a búsquedas semánticas (<em>&quot;cartas de Charizard tipo fuego raras en 151&quot;</em>).<br/>
                • <strong>Filtros por rareza:</strong> Estructura facetada que facilita el enlazado interno SEO.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-blue-400 font-bold mb-2">2. Optimización SEM & CTR</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Página de Alta Retención:</strong> Al permitir añadir cartas sin romper el flujo de navegación, la sesión del usuario supera los 4 minutos, reduciendo drásticamente la tasa de rebote en campañas PPC.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-emerald-400 font-bold mb-2">3. Retención & Viralidad CRO</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                • <strong>Exportación de Listas:</strong> El botón de copiar resumen fomenta el boca a boca orgánico en comunidades de Discord, Facebook Groups y WhatsApp de coleccionistas locales.
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* HEADER DE NAVEGACIÓN */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
              ⚡
            </span>
            <div>
              <span className="text-xl font-black text-white tracking-wide">POKÉCOLLECTR PRO</span>
              <span className="text-xs text-amber-400 font-semibold block">TCGdex Official Data + PokéAPI Integration</span>
            </div>
          </div>

          <div className="flex flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold gap-1">
            <button
              onClick={() => setActiveTab('sets')}
              className={`px-3.5 py-2 rounded-lg transition ${
                activeTab === 'sets' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Explorador de Sets ({cardsInSet.length})
            </button>
            <button
              onClick={() => setActiveTab('binder')}
              className={`px-3.5 py-2 rounded-lg transition ${
                activeTab === 'binder' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mi Binder ({myBinderCards.length} cartas)
            </button>
            <button
              onClick={() => setActiveTab('grading')}
              className={`px-3.5 py-2 rounded-lg transition ${
                activeTab === 'grading' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulador PSA & Lore
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-3.5 py-2 rounded-lg transition ${
                activeTab === 'wishlist' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wishlist ({wishlist.length})
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ========================================================================= */}
        {/* PESTAÑA 1: EXPLORADOR DE SETS OFICIALES */}
        {/* ========================================================================= */}
        {activeTab === 'sets' && (
          <section className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Selector de Colección */}
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    Colección Oficial ({setsList.length} disponibles)
                  </label>
                  {loadingSets ? (
                    <div className="text-xs text-slate-400 animate-pulse">Cargando expansiones...</div>
                  ) : (
                    <select
                      value={selectedSetId}
                      onChange={(e) => setSelectedSetId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 font-medium"
                    >
                      {setsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.cardCount?.total || s.cardCount?.official || '?'} cartas)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Filtro por Rareza */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Filtrar por Rareza
                  </label>
                  <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="ALL">Todas las rarezas</option>
                    {availableRarities.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Búsqueda por texto */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Buscar nombre o #
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pikachu, Charizard, 025..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            {loadingCards ? (
              <div className="text-center py-28">
                <div className="inline-block w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm">Descargando cartas oficiales en inglés...</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4 text-xs text-slate-400">
                  <span>Mostrando {filteredCatalogCards.length} cartas (Puedes agregar tantas como quieras sin salirte de aquí)</span>
                  <span className="text-amber-400 font-semibold">{myBinderCards.length} cartas ya en tu Binder</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredCatalogCards.map((card) => {
                    const inBinder = myBinderCards.some((c) => c.id === card.id);
                    const isWishlisted = wishlist.some((w) => w.id === card.id);

                    return (
                      <div
                        key={card.id}
                        className={`bg-slate-900 border rounded-xl p-3 flex flex-col justify-between hover:scale-[1.02] transition-all group ${
                          inBinder ? 'border-amber-500/60 shadow-lg shadow-amber-500/5' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-[2.5/3.5] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-1 mb-2">
                            <img
                              src={card.image}
                              alt={card.name}
                              loading="lazy"
                              className="max-h-full object-contain drop-shadow"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = POKEMON_CARD_BACK;
                              }}
                            />
                            <button
                              onClick={() => toggleWishlist(card)}
                              className={`absolute top-2 right-2 p-1.5 rounded-full text-xs transition backdrop-blur ${
                                isWishlisted
                                  ? 'bg-red-500 text-white shadow-lg'
                                  : 'bg-slate-950/70 text-slate-400 hover:text-white'
                              }`}
                              title={isWishlisted ? 'En tu Wishlist' : 'Añadir a Wishlist'}
                            >
                              ♥
                            </button>
                            {inBinder && (
                              <span className="absolute bottom-2 left-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                                EN BINDER
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold">
                            <span>#{card.localId}</span>
                            <span className="text-slate-400 truncate max-w-[80px]">{card.rarity}</span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-100 mt-0.5 truncate" title={card.name}>
                            {card.name}
                          </h3>

                          <div className="mt-2 flex justify-between items-center text-[11px] bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                            <span className="text-slate-400">Raw: <strong className="text-white">${card.estimatedRaw}</strong></span>
                            <span className="text-emerald-400 font-bold">PSA10: ${card.estimatedPsa10}</span>
                          </div>
                        </div>

                        {/* ACCIONES (AGREGAR AL BINDER SIN NAVEGAR FUERA) */}
                        <div className="mt-3 flex gap-1">
                          <button
                            onClick={() => addCardToBinder(card)}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded transition ${
                              inBinder 
                                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40' 
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            {inBinder ? '✓ Guardada' : '+ Binder'}
                          </button>
                          <button
                            onClick={() => {
                              setCardToGrade(card);
                              setActiveTab('grading');
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1.5 rounded border border-slate-700"
                            title="Evaluar en simulador PSA"
                          >
                            PSA
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: VIRTUAL BINDER 3X3 */}
        {/* ========================================================================= */}
        {activeTab === 'binder' && (
          <section className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <span>Carpeta de Colección 3x3</span>
                  <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    Auto-Orden Numérico (#001 → #199)
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Tus cartas se ordenan por número correlativo automáticamente según la colección que filtres.
                </p>
              </div>

              {/* FILTRO POR COLECCIÓN Y BOTÓN EXPORTAR */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={binderFilterSet}
                  onChange={(e) => {
                    setBinderFilterSet(e.target.value);
                    setBinderCurrentPage(0);
                  }}
                  className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todas las Colecciones ({myBinderCards.length})</option>
                  {availableSetsInBinder.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({myBinderCards.filter(c => c.setId === s.id).length})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleExportSummary}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition"
                  title="Copiar lista de cartas y precios al portapapeles"
                >
                  📋 Exportar Reporte
                </button>
              </div>
            </div>

            {/* ESTADÍSTICAS DEL BINDER */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Total en filtro actual</span>
                <span className="text-lg font-black text-white">{sortedBinderCards.length} cartas</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Valor Acumulado</span>
                <span className="text-lg font-black text-amber-400">${totalBinderValue.toFixed(2)} USD</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Páginas de 9 bolsillos</span>
                <span className="text-lg font-black text-blue-400">Pág. {binderCurrentPage + 1} de {totalBinderPages}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-center">
                <button
                  onClick={() => {
                    if (confirm('¿Deseas vaciar todas las cartas del Binder?')) {
                      setMyBinderCards([]);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-bold"
                >
                  Vaciar Todo el Binder
                </button>
              </div>
            </div>

            {/* SELECTOR DE PÁGINAS */}
            {totalBinderPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-2">
                <button
                  disabled={binderCurrentPage === 0}
                  onClick={() => setBinderCurrentPage((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1 bg-slate-900 text-xs font-bold rounded-lg border border-slate-800 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalBinderPages }).map((_, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => setBinderCurrentPage(pIdx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      binderCurrentPage === pIdx
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {pIdx + 1}
                  </button>
                ))}
                <button
                  disabled={binderCurrentPage === totalBinderPages - 1}
                  onClick={() => setBinderCurrentPage((prev) => Math.min(totalBinderPages - 1, prev + 1))}
                  className="px-3 py-1 bg-slate-900 text-xs font-bold rounded-lg border border-slate-800 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            )}

            {/* CUADRÍCULA VIRTUAL DEL BINDER 3X3 */}
            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 max-w-4xl mx-auto shadow-2xl">
              <div className="grid grid-cols-3 gap-4">
                {displayedPageCards.map((card, index) => {
                  const globalSlotNumber = binderCurrentPage * 9 + index + 1;
                  return (
                    <div
                      key={card ? card.id : `empty-${index}`}
                      className="relative bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl h-72 flex flex-col items-center justify-between p-3 hover:border-amber-500/40 transition group"
                    >
                      {card ? (
                        <div className="w-full h-full flex flex-col justify-between items-center">
                          <div className="flex justify-between items-center w-full px-1 text-[10px]">
                            <span className="font-black text-amber-400">#{card.localId}</span>
                            <span className="text-slate-500 truncate max-w-[80px]">{card.setName}</span>
                          </div>

                          <div className="flex-1 flex items-center justify-center overflow-hidden my-1">
                            <img
                              src={card.image}
                              alt={card.name}
                              className="max-h-48 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform"
                            />
                          </div>

                          <div className="w-full text-center">
                            <p className="text-[11px] font-bold truncate text-slate-200">{card.name}</p>
                            <span className="text-[10px] text-amber-400 font-bold">${card.estimatedRaw} USD</span>
                            <button
                              onClick={() => removeCardFromBinder(card.id)}
                              className="text-[10px] text-red-400 hover:text-red-300 block mx-auto mt-0.5"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="m-auto text-center text-slate-600">
                          <span className="text-xs font-bold block mb-1">Hueco #{globalSlotNumber}</span>
                          <span className="text-[10px] text-slate-600 block mb-2">Carta Faltante</span>
                          <button
                            onClick={() => setActiveTab('sets')}
                            className="text-[10px] text-amber-400 hover:underline font-semibold"
                          >
                            + Explorar Set
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: SIMULADOR PSA + LORE DE POKÉAPI */}
        {/* ========================================================================= */}
        {activeTab === 'grading' && (
          <section className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-2xl font-black text-white">Inspección PSA & Lore de Especie</h2>
              <p className="text-xs text-slate-400">
                Datos de la carta cruzados en vivo con la PokéAPI oficial y el calibrador de márgenes.
              </p>
            </div>

            {cardToGrade ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900 p-8 rounded-3xl border border-slate-800">
                {/* COLUMNA IZQUIERDA: VISOR DE CARTA + POKÉAPI INFO */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="relative border-4 border-amber-500/30 rounded-2xl p-4 bg-slate-950 shadow-2xl">
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
                      <div className="border-r border-b border-amber-400/20"></div>
                      <div className="border-l border-b border-amber-400/20"></div>
                      <div className="border-r border-t border-amber-400/20"></div>
                      <div className="border-l border-t border-amber-400/20"></div>
                    </div>
                    <img
                      src={cardToGrade.image}
                      alt={cardToGrade.name}
                      className="max-h-96 object-contain drop-shadow"
                    />
                  </div>

                  <h3 className="text-base font-bold text-white mt-4">{cardToGrade.name}</h3>
                  <span className="text-xs text-amber-400 font-semibold">#{cardToGrade.localId} • {cardToGrade.setName}</span>

                  {/* DATOS DE POKÉAPI EN VIVO */}
                  {loadingPokeApi ? (
                    <div className="text-xs text-slate-500 mt-4 animate-pulse">Consultando datos en PokéAPI...</div>
                  ) : pokeApiDetails ? (
                    <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800 w-full text-xs text-slate-300 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Tipos Elementales:</span>
                        <div className="flex gap-1">
                          {pokeApiDetails.types.map(t => (
                            <span key={t} className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      {pokeApiDetails.flavorText && (
                        <p className="italic text-slate-400 text-[11px] border-t border-slate-800/80 pt-2">
                          &quot;{pokeApiDetails.flavorText}&quot;
                        </p>
                      )}
                      <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-1">
                        <span>Altura: {pokeApiDetails.height} m</span>
                        <span>Peso: {pokeApiDetails.weight} kg</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* COLUMNA DERECHA: SIMULADOR DE GRADING */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-300">Centrado Frontal (Izquierda / Derecha):</span>
                      <span className="text-amber-400">{lrRatio}% / {100 - lrRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="60"
                      value={lrRatio}
                      onChange={(e) => setLrRatio(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500">Tolerancia máxima para PSA 10 en anverso: 55/45%</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-300">Centrado Frontal (Superior / Inferior):</span>
                      <span className="text-amber-400">{tbRatio}% / {100 - tbRatio}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="60"
                      value={tbRatio}
                      onChange={(e) => setTbRatio(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Inspección de Superficie</span>
                    <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasWhitening}
                        onChange={(e) => setHasWhitening(e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span>¿Tiene blanqueamiento en bordes posteriores (Whitening)?</span>
                    </label>
                    <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPrintLines}
                        onChange={(e) => setHasPrintLines(e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span>¿Tiene rayas de impresión o rayones en el foil holográfico?</span>
                    </label>
                  </div>

                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Calificación Estimada:</span>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-4 ${gradingVerdict.badge}`}>
                      {gradingVerdict.grade}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4 text-center">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Valor Actual (Raw)</span>
                        <span className="text-lg font-bold text-white">${cardToGrade.estimatedRaw} USD</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Valor Estimado Certificada</span>
                        <span className="text-lg font-bold text-emerald-400">
                          ${(cardToGrade.estimatedRaw * gradingVerdict.multiplier).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Selecciona una carta en el catálogo para evaluarla.</p>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 4: WISHLIST */}
        {/* ========================================================================= */}
        {activeTab === 'wishlist' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white">Lista de Deseos ({wishlist.length} cartas)</h2>
                <p className="text-xs text-slate-400">Tus cartas prioritarias para comprar o intercambiar.</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Presupuesto Estimado</span>
                <span className="text-lg font-bold text-amber-400">${totalWishlistValue.toFixed(2)} USD</span>
              </div>
            </div>

            {wishlist.length === 0 ? (
              <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-3">No tienes cartas añadidas a tu Wishlist.</p>
                <button
                  onClick={() => setActiveTab('sets')}
                  className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Explorar catálogo oficial
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {wishlist.map((card) => (
                  <div
                    key={card.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[2.5/3.5] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-1 mb-2">
                        <img src={card.image} alt={card.name} className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold block">#{card.localId}</span>
                      <h4 className="text-xs font-bold text-slate-100 truncate">{card.name}</h4>
                      <p className="text-xs font-bold text-emerald-400 mt-1">${card.estimatedRaw} USD</p>
                    </div>
                    <div className="mt-3 flex gap-1">
                      <button
                        onClick={() => addCardToBinder(card)}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold py-1.5 rounded transition"
                      >
                        + Binder
                      </button>
                      <button
                        onClick={() => toggleWishlist(card)}
                        className="bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[10px] px-2 py-1.5 rounded border border-red-500/30"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}