'use client';

import { useState } from 'react';
import { Search, Gift, KeyRound, Clock, Heart, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ConsultarPage() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrega, setEntrega] = useState<{
    id: number;
    codigo_secreto: string;
    destinatario: string;
    mensaje_anonimo: string | null;
    fecha_entrega: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;

    setLoading(true);
    setError(null);
    setEntrega(null);

    try {
      const res = await fetch(`/api/entregas/buscar?codigo=${encodeURIComponent(codigo.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Código no encontrado');
      }

      setEntrega(data.data);
    } catch (err: any) {
      setError(err.message || 'Error al buscar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">Consultar Código de Entrega</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          ¿Recibiste un mensaje del Bot de SearchFriend o quieres verificar el estado de un regalo?
          Ingresa tu código secreto a continuación.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl mb-8">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ej: SF-AK7492"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 font-mono tracking-wider text-sm uppercase text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !codigo.trim()}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Consultando...' : 'Buscar Regalo'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {entrega && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Destinatario Oficial
                </span>
                <h2 className="text-xl font-bold text-white">{entrega.destinatario}</h2>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Registrado
            </span>
          </div>

          <div className="py-6 space-y-4">
            <div>
              <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Mensaje Anónimo de tu Amigo Secreto:</span>
              </span>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 italic leading-relaxed">
                {entrega.mensaje_anonimo ? (
                  `"${entrega.mensaje_anonimo}"`
                ) : (
                  <span className="text-slate-500 not-italic">
                    El remitente no incluyó una nota personalizada, ¡pero tu regalo está listo!
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Fecha de entrega: {new Date(entrega.fecha_entrega).toLocaleString('es-PE')}</span>
              </div>
              <div className="font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-amber-300">
                Código: {entrega.codigo_secreto}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
