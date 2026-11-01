'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Users,
  Gift,
  Phone,
  PhoneOff,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Database,
  ArrowRight,
  LogOut,
  X,
  Search,
  QrCode,
  Smartphone,
  Check,
} from 'lucide-react';
import { Estudiante, EntregaRegalo, SystemStatus } from '@/lib/types';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Datos
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [entregas, setEntregas] = useState<EntregaRegalo[]>([]);
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Estado del Bot de WhatsApp (Baileys)
  const [botStatus, setBotStatus] = useState<{
    status: 'DISCONNECTED' | 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED';
    qrCodeDataUrl: string | null;
    connectedPhone: string | null;
    lastError: string | null;
  }>({
    status: 'DISCONNECTED',
    qrCodeDataUrl: null,
    connectedPhone: null,
    lastError: null,
  });

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'estudiantes' | 'entregas' | 'bot_whatsapp' | 'logs' | 'database'>('estudiantes');

  // Filtros
  const [studentSearch, setStudentSearch] = useState('');
  const [onlyMissingPhone, setOnlyMissingPhone] = useState(false);

  // Modales
  const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  // Prueba de mensaje desde admin
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('¡Hola! Este es un mensaje de prueba desde SearchFriend Bot.');
  const [testLoading, setTestLoading] = useState(false);

  // Estados de carga / mensajes
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Polling del estado de WhatsApp si la pestaña de bot está abierta o si está escaneando QR
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchBotStatus();
    const interval = setInterval(() => {
      if (activeTab === 'bot_whatsapp' || botStatus.status === 'SCAN_QR' || botStatus.status === 'INITIALIZING') {
        fetchBotStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab, botStatus.status]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        loadAdminData();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        loadAdminData();
      } else {
        setAuthError(data.error || 'PIN incorrecto');
      }
    } catch {
      setAuthError('Error de conexión');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
    setPinInput('');
  };

  const loadAdminData = async () => {
    setActionLoading(true);
    try {
      const [resEst, resEnt, resStat, resLogs] = await Promise.all([
        fetch('/api/admin/estudiantes'),
        fetch('/api/admin/entregas'),
        fetch('/api/status'),
        fetch('/api/admin/logs-whatsapp'),
      ]);

      const [dataEst, dataEnt, dataStat, dataLogs] = await Promise.all([
        resEst.json(),
        resEnt.json(),
        resStat.json(),
        resLogs.json(),
      ]);

      if (dataEst.success) setEstudiantes(dataEst.data);
      if (dataEnt.success) setEntregas(dataEnt.data);
      if (dataStat.success) setSystemStatus(dataStat.data);
      if (dataLogs.success) setWaLogs(dataLogs.logs);

      fetchBotStatus();
    } catch (err) {
      console.error('Error al cargar datos de admin:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchBotStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setBotStatus(data.data);
      }
    } catch (e) {
      console.error('Error al consultar estado del bot:', e);
    }
  };

  const handleDisconnectBot = async () => {
    if (!confirm('¿Deseas desvincular el número actual del bot de WhatsApp? Se generará un nuevo QR.')) return;
    try {
      await fetch('/api/admin/whatsapp/disconnect', { method: 'POST' });
      showToast('success', 'Bot desvinculado. Generando nuevo código QR...');
      fetchBotStatus();
    } catch {
      showToast('error', 'Error al desvincular el bot');
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Crear estudiante
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/estudiantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newStudentName.trim(),
          telefono_whatsapp: newStudentPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Estudiante creado exitosamente');
        setShowAddModal(false);
        setNewStudentName('');
        setNewStudentPhone('');
        loadAdminData();
      } else {
        showToast('error', data.error || 'Error al crear estudiante');
      }
    } catch {
      showToast('error', 'Error al crear');
    } finally {
      setActionLoading(false);
    }
  };

  // Editar estudiante
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/estudiantes/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editingStudent.nombre,
          telefono_whatsapp: editingStudent.telefono_whatsapp,
          activo: editingStudent.activo,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Datos del estudiante actualizados correctamente');
        setEditingStudent(null);
        loadAdminData();
      } else {
        showToast('error', data.error || 'Error al actualizar');
      }
    } catch {
      showToast('error', 'Error al guardar');
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar estudiante
  const handleDeleteStudent = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${nombre}? Esto borrará sus registros asociados.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/estudiantes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Estudiante eliminado');
        loadAdminData();
      } else {
        showToast('error', data.error || 'Error al eliminar');
      }
    } catch {
      showToast('error', 'Error al eliminar');
    } finally {
      setActionLoading(false);
    }
  };

  // Desbloquear límite semanal de un estudiante
  const handleUnlockStudent = async (id: number, nombre: string, unlock = true) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/estudiantes/${id}/desbloquear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlock }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || `${nombre} actualizado`);
        loadAdminData();
      } else {
        showToast('error', data.error || 'Error al desbloquear');
      }
    } catch {
      showToast('error', 'Error al desbloquear');
    } finally {
      setActionLoading(false);
    }
  };

  // Desbloquear a todos los estudiantes de una vez
  const handleUnlockAll = async () => {
    if (!confirm('¿Deseas desbloquear a TODOS los estudiantes para que puedan recibir otro regalo esta semana de inmediato?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/estudiantes/desbloquear-todos', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', '¡Todos los estudiantes han sido desbloqueados para recibir regalos!');
        loadAdminData();
      } else {
        showToast('error', data.error || 'Error al desbloquear a todos');
      }
    } catch {
      showToast('error', 'Error al desbloquear');
    } finally {
      setActionLoading(false);
    }
  };

  // Reenviar WhatsApp de entrega
  const handleResendWhatsApp = async (codigo: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/reenviar-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_secreto: codigo }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Alerta de WhatsApp enviada directamente al celular');
        loadAdminData();
      } else {
        showToast('error', data.error || 'No se pudo enviar la alerta');
      }
    } catch {
      showToast('error', 'Error de conexión al reenviar');
    } finally {
      setActionLoading(false);
    }
  };

  // Pantalla de bloqueo con PIN
  if (isAuthenticated === false) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/20">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl font-black text-center text-white mb-2">Panel de Administración</h1>
          <p className="text-xs text-center text-slate-400 mb-6">
            Acceso restringido para organizadores. Ingresa el PIN configurado en tu archivo{' '}
            <code className="text-rose-400 bg-slate-950 px-1 py-0.5 rounded">.env.local</code>.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                PIN de Acceso
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="admin123"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !pinInput}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>{authLoading ? 'Verificando...' : 'Desbloquear Panel'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500">
              Enter the PIN defined in your <code className="text-slate-300">.env.local</code> file
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  }

  // Filtrado de alumnos
  const filteredStudents = estudiantes.filter((e) => {
    const matchesSearch = e.nombre.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesMissing = onlyMissingPhone ? !e.telefono_whatsapp || e.telefono_whatsapp.trim() === '' : true;
    return matchesSearch && matchesMissing;
  });

  const missingCount = estudiantes.filter((e) => !e.telefono_whatsapp || e.telefono_whatsapp.trim() === '').length;

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            notification.type === 'success'
              ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-rose-500/40 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Panel de Administración</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              SearchFriend Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestión de estudiantes, números pendientes, vinculación QR de WhatsApp y logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            disabled={actionLoading}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-medium text-rose-300 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Alumnos del Salón</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{estudiantes.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {estudiantes.filter((e) => e.activo).length} activos para recibir
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Bot WhatsApp</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black truncate">
            {botStatus.status === 'CONNECTED' ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
            ) : botStatus.status === 'SCAN_QR' ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                Esperando QR
              </span>
            ) : (
              <span className="text-slate-400">Desconectado</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {botStatus.connectedPhone || 'Click en pestaña Bot para escanear'}
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('estudiantes');
            setOnlyMissingPhone(true);
          }}
          className={`border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all ${
            missingCount > 0
              ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-300 font-medium">Números Pendientes</span>
            <PhoneOff className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{missingCount}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">
            {missingCount > 0 ? 'Click para completar números' : 'Todos tienen WhatsApp'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Entregas Realizadas</span>
            <Gift className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-extrabold text-pink-400">{entregas.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Regalos registrados</div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 mb-6 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('estudiantes')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'estudiantes'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Estudiantes ({estudiantes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bot_whatsapp')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'bot_whatsapp'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Vincular Bot WhatsApp (QR)</span>
          {botStatus.status === 'CONNECTED' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('entregas')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'entregas'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Historial de Entregas ({entregas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Logs de Envíos ({waLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'database'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Datos & Supabase</span>
        </button>
      </div>

      {/* TAB 1: ESTUDIANTES */}
      {activeTab === 'estudiantes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar estudiante..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={() => setOnlyMissingPhone(!onlyMissingPhone)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  onlyMissingPhone
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Solo sin teléfono ({missingCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUnlockAll}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                title="Permite que todos los estudiantes puedan recibir otro regalo esta semana de inmediato"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Desbloquear Todos</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Estudiante</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4"># ID</th>
                    <th className="py-3 px-4">Nombre del Alumno</th>
                    <th className="py-3 px-4">Teléfono WhatsApp</th>
                    <th className="py-3 px-4">Envío Semanal</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No se encontraron estudiantes con esos criterios.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const hasPhone = !!(st.telefono_whatsapp && st.telefono_whatsapp.trim());
                      return (
                        <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{st.id}</td>
                          <td className="py-3 px-4 font-semibold text-white">{st.nombre}</td>
                          <td className="py-3 px-4">
                            {hasPhone ? (
                              <span className="font-mono text-emerald-400 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {st.telefono_whatsapp}
                              </span>
                            ) : (
                              <button
                                onClick={() => setEditingStudent({ ...st })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] hover:bg-amber-500/20 transition-colors"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Pendiente (Click para agregar)</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {Number(st.desbloqueado_admin) === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                <Unlock className="w-3 h-3 text-emerald-400" />
                                <span>Desbloqueado</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUnlockStudent(st.id, st.nombre, true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 transition-colors"
                                title="Permite que le envíen otro regalo esta semana sin esperar al lunes"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Desbloquear</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                st.activo
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {st.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => setEditingStudent({ ...st })}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                              title="Editar datos o número"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(st.id, st.nombre)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                              title="Eliminar estudiante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VINCULAR BOT WHATSAPP (QR) */}
      {activeTab === 'bot_whatsapp' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  Bot Centralizado de WhatsApp (Baileys)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Permite que la web envíe mensajes de WhatsApp reales de forma directa e instantánea
                  sin costo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBotStatus}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refrescar Estado</span>
                </button>

                {botStatus.status === 'CONNECTED' && (
                  <button
                    onClick={handleDisconnectBot}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Desvincular
                  </button>
                )}
              </div>
            </div>

            {/* ESTADO CONECTADO */}
            {botStatus.status === 'CONNECTED' ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">¡Bot de WhatsApp Conectado y Activo!</h3>
                  <p className="text-sm text-emerald-400 font-mono mt-1">
                    Número vinculado: {botStatus.connectedPhone}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
                    Cada vez que un compañero envíe un regalo en la página principal, este bot despachará
                    el mensaje al instante y de forma 100% anónima.
                  </p>
                </div>

                {/* Caja para mensaje de prueba */}
                <div className="max-w-md mx-auto mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left">
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    Enviar mensaje de prueba en vivo
                  </span>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="+51999999999"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      disabled={testLoading || !testPhone}
                      onClick={async () => {
                        setTestLoading(true);
                        try {
                          const res = await fetch('/api/admin/reenviar-whatsapp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              codigo_secreto: entregas[0]?.codigo_secreto || 'TEST-123',
                            }),
                          });
                          showToast('success', 'Mensaje de prueba despachado');
                        } catch {
                          showToast('error', 'Error al enviar prueba');
                        } finally {
                          setTestLoading(false);
                        }
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testLoading ? 'Enviando...' : 'Probar Envío Real'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : botStatus.status === 'SCAN_QR' && botStatus.qrCodeDataUrl ? (
              /* ESTADO ESCANEAR QR */
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-3 bg-white rounded-2xl shadow-2xl">
                  <img
                    src={botStatus.qrCodeDataUrl}
                    alt="Código QR WhatsApp"
                    className="w-64 h-64 rounded-xl"
                  />
                </div>

                <div className="space-y-2 max-w-sm">
                  <h3 className="text-base font-bold text-white">Escanea este código con tu WhatsApp</h3>
                  <ol className="text-xs text-slate-400 text-left space-y-1.5 list-decimal pl-5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <li>Abre WhatsApp en el celular que servirá de Bot.</li>
                    <li>Toca el menú de tres puntos (o Ajustes en iPhone).</li>
                    <li>Selecciona <strong>Dispositivos vinculados</strong>.</li>
                    <li>Toca <strong>Vincular un dispositivo</strong> y apunta al código QR.</li>
                  </ol>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ⚡ Se conectará automáticamente apenas lo escanees.
                  </p>
                </div>
              </div>
            ) : (
              /* ESTADO INICIALIZANDO */
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
                <h3 className="text-base font-semibold text-white">Iniciando servicio de WhatsApp...</h3>
                <p className="text-xs text-slate-400">
                  Generando sesión y código QR. Por favor espera unos segundos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIAL DE ENTREGAS */}
      {activeTab === 'entregas' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Destinatario</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Mensaje</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4 text-right">Acción WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
                  {entregas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Aún no se han notificado entregas de regalos.
                      </td>
                    </tr>
                  ) : (
                    entregas.map((ent) => (
                      <tr key={ent.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">{ent.id}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{ent.estudiante_nombre}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {ent.estudiante_telefono || 'Sin teléfono'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-300 border border-slate-800 font-bold">
                            {ent.codigo_secreto}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                          {ent.mensaje_anonimo ? (
                            `"${ent.mensaje_anonimo}"`
                          ) : (
                            <span className="text-slate-600 italic">Sin mensaje</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(ent.fecha_entrega).toLocaleString('es-PE')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleResendWhatsApp(ent.codigo_secreto)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reenviar WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOGS DE WHATSAPP */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden p-4">
            <h3 className="text-sm font-bold text-white mb-3">Últimas alertas despachadas</h3>

            {waLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No hay envíos registrados todavía. Notifica una entrega en la página principal para ver el log en vivo.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {waLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-bold">[{log.status}] vía {log.provider}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('es-PE')}</span>
                    </div>
                    <div className="text-slate-200">
                      <strong>Para:</strong> {log.studentName} ({log.to}) | <strong>Código:</strong> {log.secretCode}
                    </div>
                    <div className="p-2.5 rounded bg-slate-900/90 text-slate-300 text-[11px] whitespace-pre-wrap border border-slate-800 font-sans">
                      {log.messageText}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BASE DE DATOS & SUPABASE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-rose-500" />
              Estado de Base de Datos Actual
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Proveedor Configurado</span>
                <span className="font-mono text-base font-bold text-emerald-400 uppercase">
                  {systemStatus?.dbProvider} (XAMPP / MySQL)
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Conexión Local</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {systemStatus?.dbConnected ? 'CONECTADO (3306)' : 'ERROR'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Total Registros</span>
                <span className="font-mono text-base font-bold text-white">
                  {estudiantes.length} alumnos / {entregas.length} entregas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ESTUDIANTE */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-rose-500" />
                Editar Estudiante #{editingStudent.id}
              </h2>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingStudent.nombre}
                  onChange={(e) => setEditingStudent({ ...editingStudent, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teléfono WhatsApp (Con código de país, ej: +51999999999)
                </label>
                <input
                  type="text"
                  placeholder="+51999999999"
                  value={editingStudent.telefono_whatsapp || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, telefono_whatsapp: e.target.value || null })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Completar aquí para <strong>Jose Apaza</strong> o <strong>Fernando Mansilla</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activoCheck"
                  checked={!!editingStudent.activo}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, activo: e.target.checked ? 1 : 0 })
                  }
                  className="w-4 h-4 rounded text-rose-600 bg-slate-950 border-slate-800"
                />
                <label htmlFor="activoCheck" className="text-xs text-slate-300">
                  Estudiante Activo para recibir regalos
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR ESTUDIANTE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-500" />
                Agregar Nuevo Estudiante
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofia Morales"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teléfono WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="+51999999999"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Crear Estudiante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
