'use client';

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Gift,
  Send,
  ShieldCheck,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Clock,
  RefreshCw,
  Lock,
  Volume2,
  VolumeX,
  Palette,
  KeyRound,
} from 'lucide-react';
import { EstudiantePublico } from '@/lib/types';
import Link from 'next/link';

// Colores de las cajitas de regalo según el tema
const GIFT_COLORS_PINK = [
  'linear-gradient(135deg, #FF6FC0, #FF3FA4)',
  'linear-gradient(135deg, #DAC2FF, #B98CFF)',
  'linear-gradient(135deg, #FFF0A8, #FFD447)',
  'linear-gradient(135deg, #FF8CCB, #C6127A)',
];

const GIFT_COLORS_BLUE = [
  'linear-gradient(135deg, #38BDF8, #0284C7)',
  'linear-gradient(135deg, #93C5FD, #3B82F6)',
  'linear-gradient(135deg, #FDE68A, #F59E0B)',
  'linear-gradient(135deg, #67E8F9, #0891B2)',
];

export default function StudentHomePage() {
  const [theme, setTheme] = useState<'pink' | 'blue'>('pink');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const [estudiantes, setEstudiantes] = useState<EstudiantePublico[]>([]);
  const [filteredEstudiantes, setFilteredEstudiantes] = useState<EstudiantePublico[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<EstudiantePublico | null>(null);

  const [mensajeAnonimo, setMensajeAnonimo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de animación de la máquina gachapon
  const [isSpinning, setIsSpinning] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [targetSpeed, setTargetSpeed] = useState(0.5);

  // Resultado de la entrega
  const [entregaExitosa, setEntregaExitosa] = useState<{
    codigo: string;
    destinatario: string;
    mensaje: string | null;
    whatsappStatus: any;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Referencias para la animación de las cajitas de regalo en la esfera
  const cageRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const giftsState = useRef<
    Array<{
      el: HTMLDivElement;
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      vRot: number;
    }>
  >([]);

  // Cargar preferencia de tema de localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('sf_theme') as 'pink' | 'blue';
    if (savedTheme) setTheme(savedTheme);

    const savedSound = localStorage.getItem('sf_sound');
    if (savedSound !== null) setSoundOn(savedSound === 'true');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'pink' ? 'blue' : 'pink';
    setTheme(next);
    localStorage.setItem('sf_theme', next);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem('sf_sound', String(next));
  };

  // Sonido kawaii con Web Audio API (campanitas alegres)
  const playChime = () => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.45);
      });
    } catch {}
  };

  // Cargar alumnos y verificar regla semanal (reinicio los lunes)
  useEffect(() => {
    fetchEstudiantes();
  }, []);

  const fetchEstudiantes = async () => {
    try {
      setLoadingList(true);
      const res = await fetch('/api/estudiantes');
      const data = await res.json();
      if (data.success) {
        setEstudiantes(data.data);
        setFilteredEstudiantes(data.data);
      } else {
        setErrorMsg(data.error || 'Could not connect to the database.');
      }
    } catch {
      setErrorMsg('Error connecting to the server.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEstudiantes(estudiantes);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredEstudiantes(
        estudiantes.filter((e) => e.nombre.toLowerCase().includes(q))
      );
    }
  }, [searchTerm, estudiantes]);

  // Inicializar física de las 13 CAJITAS DE REGALO dentro de la esfera
  useEffect(() => {
    if (!cageRef.current) return;
    const cageEl = cageRef.current;
    cageEl.innerHTML = '';
    giftsState.current = [];

    const CAGE_SIZE = 210 - 12; // 198px diámetro interior
    const R = CAGE_SIZE / 2;
    const GIFT_SIZE = 36;
    const colors = theme === 'pink' ? GIFT_COLORS_PINK : GIFT_COLORS_BLUE;

    for (let i = 0; i < 13; i++) {
      const box = document.createElement('div');
      box.className = 'mini-gift';
      box.style.position = 'absolute';
      box.style.width = `${GIFT_SIZE}px`;
      box.style.height = `${GIFT_SIZE}px`;
      box.style.borderRadius = '10px';
      box.style.background = colors[i % colors.length];
      box.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2), inset 0 0 0 2px rgba(255,255,255,0.7)';
      box.style.display = 'flex';
      box.style.alignItems = 'center';
      box.style.justifyContent = 'center';
      box.style.fontSize = '18px';
      box.style.userSelect = 'none';
      box.style.pointerEvents = 'none';
      box.style.willChange = 'transform';
      box.innerText = '🎁';

      cageEl.appendChild(box);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (R - GIFT_SIZE);

      giftsState.current.push({
        el: box,
        x: R + Math.cos(angle) * dist,
        y: R + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 4,
      });
    }

    let currentSpeed = 0.5;

    const animate = () => {
      currentSpeed += (targetSpeed - currentSpeed) * 0.06;
      const CAGE_INNER = 210 - 12;
      const radius = CAGE_INNER / 2;
      const boxRadius = GIFT_SIZE / 2;

      giftsState.current.forEach((g) => {
        g.vy += 0.03 * (currentSpeed > 2 ? 0.4 : 1); // Gravedad suave
        const len = Math.hypot(g.vx, g.vy) || 1;
        const want = Math.max(currentSpeed, 0.6);
        g.vx = (g.vx / len) * Math.min(len, want * 1.4);
        g.vy = (g.vy / len) * Math.min(len, want * 1.4);

        g.x += g.vx * (currentSpeed > 2 ? 2.2 : 1);
        g.y += g.vy * (currentSpeed > 2 ? 2.2 : 1);
        g.rotation += g.vRot * (currentSpeed > 2 ? 3 : 1);

        const dx = g.x - radius;
        const dy = g.y - radius;
        const distFromCenter = Math.hypot(dx, dy);
        const limit = radius - boxRadius;

        if (distFromCenter > limit) {
          const nx = dx / distFromCenter;
          const ny = dy / distFromCenter;
          g.x = radius + nx * limit;
          g.y = radius + ny * limit;
          const dot = g.vx * nx + g.vy * ny;
          g.vx -= 2 * dot * nx;
          g.vy -= 2 * dot * ny;
          if (currentSpeed > 2) {
            g.vx += (Math.random() - 0.5) * 2.5;
            g.vy += (Math.random() - 0.5) * 2.5 - 1;
          }
        }

        g.el.style.transform = `translate(${g.x - boxRadius}px, ${g.y - boxRadius}px) rotate(${g.rotation}deg)`;
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [theme, targetSpeed]);

  // Explosión de destellos kawaii
  const triggerBurst = () => {
    if (!trayRef.current) return;
    const sparkles = ['✧', '♡', '☆', '✦', '🎁', '✨', '💖'];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'burst-particle';
      s.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
      s.style.fontSize = `${16 + Math.random() * 14}px`;
      const a = Math.random() * Math.PI * 2;
      const d = 70 + Math.random() * 60;
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      trayRef.current.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  };

  // Enviar entrega anónima con animación de máquina
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedStudent) {
      setErrorMsg('Please select a classmate from the list.');
      return;
    }

    if (!selectedStudent.puede_recibir_hoy && !selectedStudent.desbloqueado_admin) {
      setErrorMsg(
        `⛔ ${selectedStudent.nombre} already received their gift this week. Notifications reset every Monday at 00:00 (or if the admin unlocks them).`
      );
      return;
    }

    setLoading(true);
    setIsSpinning(true);
    setTargetSpeed(4.5); // Acelerar las cajitas dentro de la esfera
    setEntregaExitosa(null);

    try {
      const res = await fetch('/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: selectedStudent.id,
          mensaje_anonimo: mensajeAnonimo || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'An error occurred while notifying the delivery.');
      }

      // Esperar 1.4 segundos para disfrutar la animación kawaii del gachapon
      setTimeout(() => {
        setIsSpinning(false);
        setTargetSpeed(0.5);

        playChime();
        triggerBurst();

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: theme === 'pink' ? ['#FF3FA4', '#FFD3ED', '#FFD447', '#FFF'] : ['#0284C7', '#BAE6FD', '#FBBF24', '#FFF'],
        });

        setEntregaExitosa({
          codigo: data.entrega.codigo_secreto,
          destinatario: data.entrega.destinatario,
          mensaje: data.entrega.mensaje_anonimo,
          whatsappStatus: data.whatsapp,
        });

        setSelectedStudent(null);
        setMensajeAnonimo('');
        fetchEstudiantes();
      }, 1400);
    } catch (err: any) {
      setIsSpinning(false);
      setTargetSpeed(0.5);
      setErrorMsg(err.message || 'Connection error');
    } finally {
      setTimeout(() => setLoading(false), 1400);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addEmoji = (emoji: string) => {
    setMensajeAnonimo((prev) => prev + emoji);
  };

  const deliveredCount = estudiantes.filter((e) => !e.puede_recibir_hoy).length;

  return (
    <div
      className={`min-h-screen py-8 px-4 flex flex-col items-center justify-center relative overflow-x-hidden ${
        theme === 'pink' ? 'theme-pink' : 'theme-blue'
      } nihongo-bg`}
    >
      {/* Sparkles flotantes en el fondo (como NihonGO) */}
      {['✧', '♡', '☆', '✦', '🎁', '🎀', '✨', '💖'].map((s, idx) => (
        <span
          key={idx}
          className="nihongo-sparkle"
          style={{
            left: `${(idx * 13) % 95}vw`,
            top: `${(idx * 17) % 90}vh`,
            fontSize: `${16 + (idx % 4) * 8}px`,
            animationDelay: `${(idx * 0.4) % 2.5}s`,
          }}
        >
          {s}
        </span>
      ))}

      {/* Tarjeta Principal Estilo NihonGO */}
      <div className="relative z-10 w-full max-w-[480px]">
        <div
          className="rounded-[36px] p-6 sm:p-8 text-center relative border-4 border-white shadow-2xl transition-all duration-300"
          style={{
            background: 'var(--cream)',
            boxShadow:
              theme === 'pink'
                ? '0 18px 0 rgba(198,18,122,0.25), 0 26px 50px rgba(198,18,122,0.35)'
                : '0 18px 0 rgba(3,105,161,0.25), 0 26px 50px rgba(3,105,161,0.35)',
          }}
        >
          {/* Título Principal */}
          <h1 className="font-mochiy text-3xl sm:text-4xl m-0 tracking-tight" style={{ color: 'var(--deep)' }}>
            SearchFriend! <span className="text-rose-500">♡</span>
          </h1>
          <p className="font-bold text-xs uppercase tracking-widest mt-1 mb-4" style={{ color: 'var(--deep)' }}>
            <span className="font-mochiy text-sm">アミーゴ・セクレト！</span>
            <br />
            Anonymous Secret Santa Delivery!
          </p>

          {/* Selector de Opciones Kawaii (Tema Rosa/Azul + Sonido) */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              style={{
                background: '#fff',
                borderColor: 'var(--bubblegum)',
                color: 'var(--deep)',
              }}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme: {theme === 'pink' ? '🌸 Pink' : '💙 Blue'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSound}
              className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              style={{
                background: soundOn ? 'var(--gold)' : '#fff',
                borderColor: soundOn ? 'var(--gold)' : 'var(--bubblegum)',
                color: 'var(--ink)',
              }}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundOn ? 'Sound: ON' : 'Sound: OFF'}</span>
            </button>
          </div>

          {/* MÁQUINA GACHAPON DE CAJITAS DE REGALO */}
          <div className="relative h-[250px] flex justify-center mb-1">
            {/* Base Stand */}
            <div
              className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[130px] h-[26px] rounded-t-2xl rounded-b-3xl shadow-md z-[1]"
              style={{
                background:
                  theme === 'pink'
                    ? 'linear-gradient(180deg, var(--lavender), #8E5FE0)'
                    : 'linear-gradient(180deg, var(--lavender), #0369A1)',
              }}
            />

            {/* Esfera de Cristal con las 13 Cajitas de Regalo */}
            <div
              ref={cageRef}
              className={`relative w-[210px] h-[210px] rounded-full border-[6px] border-white overflow-hidden z-[2] shadow-xl ${
                isSpinning ? 'cage-shake' : ''
              }`}
              style={{
                background:
                  theme === 'pink'
                    ? 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0, rgba(255,255,255,0.35) 22%, transparent 40%), radial-gradient(circle at 50% 50%, #FFF0F9 0%, #FFD3ED 100%)'
                    : 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0, rgba(255,255,255,0.35) 22%, transparent 40%), radial-gradient(circle at 50% 50%, #F0F9FF 0%, #BAE6FD 100%)',
                boxShadow:
                  theme === 'pink'
                    ? '0 0 0 4px var(--bubblegum), inset 0 0 30px rgba(255,63,164,0.25), 0 10px 24px rgba(198,18,122,0.3)'
                    : '0 0 0 4px var(--bubblegum), inset 0 0 30px rgba(2,132,199,0.25), 0 10px 24px rgba(3,105,161,0.3)',
              }}
            />

            {/* Salida Chute */}
            <div
              className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[44px] h-[30px] border-[3px] border-white rounded-b-2xl z-[3] shadow-md"
              style={{
                background:
                  theme === 'pink'
                    ? 'linear-gradient(180deg, #FFE6F6, #FFB7DE)'
                    : 'linear-gradient(180deg, #E0F2FE, #7DD3FC)',
              }}
            />
          </div>

          {/* BANDEJA TRAY: Muestra el Regalo o Estado */}
          <div
            ref={trayRef}
            className="relative min-h-[140px] my-4 mx-[-6px] rounded-[30px] p-4 flex flex-col items-center justify-center border-4 border-dashed overflow-hidden shadow-inner transition-all duration-300"
            style={{
              background:
                theme === 'pink'
                  ? 'linear-gradient(180deg, #FFC4E4 0%, #FFE6F6 55%, #fff 100%)'
                  : 'linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 55%, #fff 100%)',
              borderColor: 'var(--bubblegum)',
            }}
          >
            {entregaExitosa ? (
              <div className="w-full text-center space-y-2 animate-in zoom-in-95 duration-200">
                <div className="text-3xl animate-bounce">🎁</div>
                <div className="font-mochiy text-lg leading-tight" style={{ color: 'var(--deep)' }}>
                  Delivered to {entregaExitosa.destinatario}!
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-full border border-pink-200 text-xs font-mono font-bold shadow-sm">
                  <span>Code: {entregaExitosa.codigo}</span>
                  <button onClick={() => copyToClipboard(entregaExitosa.codigo)} title="Copiar código">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
                <p className="text-[11px] font-bold text-emerald-700">
                  ⚡ Alert sent instantly to their WhatsApp!
                </p>
              </div>
            ) : selectedStudent ? (
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Selected Recipient:
                </span>
                <div className="font-mochiy text-xl" style={{ color: 'var(--deep)' }}>
                  {selectedStudent.nombre}
                </div>
                {selectedStudent.tiene_telefono ? (
                  <span className="text-[11px] text-emerald-600 font-bold">● WhatsApp Ready</span>
                ) : (
                  <span className="text-[11px] text-amber-600 font-bold">● Phone number pending registration</span>
                )}
              </div>
            ) : (
              <span className="font-bold text-xs sm:text-sm px-4" style={{ color: 'var(--lavender)' }}>
                ✨ Select a classmate below and press the big button to send your gift ♡
              </span>
            )}
          </div>

          {/* ALERTA DE ERROR */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-100 border border-rose-300 text-rose-800 text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORMULARIO DE OPCIONES PARA LOS ESTUDIANTES */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Paso 1: Buscador y selección de compañeros */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--deep)' }}>
                  1. Who is the gift for?
                </label>
                <span className="text-[11px] font-bold opacity-75" style={{ color: 'var(--ink)' }}>
                  {estudiantes.length} students
                </span>
              </div>

              {/* Input de búsqueda */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search classmate by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border-2 rounded-2xl pl-8 pr-3 py-1.5 text-xs focus:outline-none transition-colors"
                  style={{ borderColor: 'var(--bubblegum)', color: 'var(--ink)' }}
                />
              </div>

              {/* Lista en pastillas/chips de alumnos */}
              {loadingList ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading classmates...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-2xl bg-white/60 border border-pink-100">
                  {filteredEstudiantes.map((st) => {
                    const isSelected = selectedStudent?.id === st.id;
                    const isBlocked = !st.puede_recibir_hoy && !st.desbloqueado_admin;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => setSelectedStudent(st)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                          isBlocked
                            ? 'opacity-40 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : isSelected
                            ? 'text-white border-2 shadow-md scale-105'
                            : 'bg-white hover:border-pink-300 text-slate-700 border border-slate-200'
                        }`}
                        style={{
                          background: isSelected ? 'var(--hotpink)' : undefined,
                          borderColor: isSelected ? 'var(--deep)' : undefined,
                        }}
                      >
                        <span>{st.nombre}</span>
                        {isBlocked ? (
                          <span className="text-[10px] text-amber-600 font-mono flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Monday</span>
                          </span>
                        ) : isSelected ? (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Paso 2: Mensaje anónimo de texto */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--deep)' }}>
                  2. Your anonymous hint or message:
                </label>
                <span className="text-[10px] font-bold text-slate-400">{mensajeAnonimo.length}/300</span>
              </div>
              <textarea
                rows={2}
                maxLength={300}
                placeholder="e.g. 'Your gift is in locker #12. Hope you love it! 🎁'"
                value={mensajeAnonimo}
                onChange={(e) => setMensajeAnonimo(e.target.value)}
                className="w-full bg-white border-2 rounded-2xl p-2.5 text-xs focus:outline-none transition-colors"
                style={{ borderColor: 'var(--bubblegum)', color: 'var(--ink)' }}
              />

              {/* Botones de emojis rápidos */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-bold text-slate-400">Hints:</span>
                {['🎁', '🍫', '✨', '🎉', '💖', '🤫'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    className="p-1 rounded-lg bg-white border border-pink-100 text-xs hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* BOTÓN GIGANTE ESTILO NIHONGO (.btn-draw) */}
            <button
              type="submit"
              disabled={loading || !selectedStudent || (!selectedStudent.puede_recibir_hoy && !selectedStudent.desbloqueado_admin)}
              className="w-full py-3.5 px-6 rounded-full font-mochiy text-base sm:text-lg text-white tracking-wide transition-all duration-150 active:translate-y-1 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  theme === 'pink'
                    ? 'linear-gradient(135deg, var(--hotpink), var(--deep))'
                    : 'linear-gradient(135deg, #0284C7, #0369A1)',
                boxShadow:
                  theme === 'pink'
                    ? '0 8px 0 var(--deep), 0 14px 24px rgba(198,18,122,0.4)'
                    : '0 8px 0 #0369A1, 0 14px 24px rgba(3,105,161,0.4)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sending gift...!</span>
                </span>
              ) : (
                <span>Send Secret Gift! 🎁 ♡</span>
              )}
            </button>
          </form>

          {/* FILA DE CONTADOR Y REGLA DE LOS LUNES */}
          <div className="mt-5 pt-3 border-t-2 border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-bold">
            <div className="flex items-center gap-1 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Auto-reset: <strong>Every Monday at 00:00</strong></span>
            </div>

            <div style={{ color: 'var(--deep)' }}>
              <span>{deliveredCount} / {estudiantes.length} classmates with gift</span>
            </div>
          </div>

          {/* Enlace sutil para consultar código */}
          <div className="mt-3 text-center">
            <Link
              href="/consultar"
              className="text-[11px] font-bold underline opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--deep)' }}
            >
              Have a claim code? Click here to look up your gift 🔍
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
