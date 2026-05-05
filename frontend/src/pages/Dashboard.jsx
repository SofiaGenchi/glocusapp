import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/authStore';
import api from '../api/axios';

const contextOptions = ['', 'Ayunas', 'Después de comer', 'Antes de comer', 'Antes de dormir', 'Ejercicio', 'Otro'];

const inputClass = 'mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 outline-none transition focus:border-brand-main focus:ring-4 focus:ring-brand-accent/25';
const secondaryButtonClass = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-brand-accent/25';

const getToday = () => new Date().toISOString().slice(0, 10);
const getNowTime = () => new Date().toTimeString().slice(0, 5);
const getCurrentDateTime = () => ({
    date: getToday(),
    time: getNowTime()
});

const buildFilterParams = (nextFilters) => {
    const params = {};
    if (nextFilters.from) params.from = nextFilters.from;
    if (nextFilters.to) params.to = nextFilters.to;
    return params;
};

const formatPeriod = (filters) => {
    if (filters.from && filters.to) return `${filters.from} al ${filters.to}`;
    if (filters.from) return `Desde ${filters.from}`;
    if (filters.to) return `Hasta ${filters.to}`;
    return 'Todas las mediciones';
};

const getUserDisplayName = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Usuario';

const getReportValidationError = (filters) => {
    if (!filters.from && !filters.to) return '';
    if (!filters.from || !filters.to) return 'Para imprimir un período específico, seleccioná fecha desde y hasta.';

    const from = new Date(`${filters.from}T00:00:00`);
    const to = new Date(`${filters.to}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Seleccioná fechas válidas para imprimir.';
    if (to < from) return 'La fecha final no puede ser anterior a la fecha inicial.';

    const days = (to - from) / (1000 * 60 * 60 * 24);
    if (days < 30) return 'El reporte debe cubrir al menos un mes. Elegí un rango de 30 días o más.';

    return '';
};

const initialForm = {
    glucose_value: '',
    date: getToday(),
    time: getNowTime(),
    unit: 'mg/dL',
    context: '',
    notes: ''
};

const getStatus = (measurement) => {
    const value = Number(measurement.glucose_value);
    const unit = measurement.unit || 'mg/dL';

    if (unit === 'mmol/L') {
        if (value < 3.9) return { label: 'Bajo', className: 'bg-amber-100 text-amber-800', dotClass: 'bg-amber-500' };
        if (value > 10) return { label: 'Alto', className: 'bg-red-100 text-red-800', dotClass: 'bg-red-600' };
        return { label: 'En rango', className: 'bg-emerald-100 text-emerald-800', dotClass: 'bg-emerald-600' };
    }

    if (value < 70) return { label: 'Bajo', className: 'bg-amber-100 text-amber-800', dotClass: 'bg-amber-500' };
    if (value > 180) return { label: 'Alto', className: 'bg-red-100 text-red-800', dotClass: 'bg-red-600' };
    return { label: 'En rango', className: 'bg-emerald-100 text-emerald-800', dotClass: 'bg-emerald-600' };
};

const StatusPill = ({ measurement }) => {
    const status = getStatus(measurement);

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
            <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
            {status.label}
        </span>
    );
};

const StatCard = ({ label, value, helper, tone = 'default' }) => {
    const valueClass = tone === 'danger' ? 'text-red-700' : tone === 'success' ? 'text-emerald-700' : 'text-slate-950';

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-black leading-none ${valueClass}`}>{value}</p>
            {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
        </div>
    );
};

const MenuLink = ({ href, children, onClick }) => (
    <a
        href={href}
        onClick={onClick}
        className="block min-h-12 rounded-lg px-4 py-3 text-base font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/30"
    >
        {children}
    </a>
);

const DashboardHeader = ({ user, menuOpen, onToggleMenu, onCloseMenu, onLogout, onPrint }) => {
    const userName = getUserDisplayName(user);

    return (
        <>
            <header className="sticky top-0 z-[90] border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="min-w-0">
                        <a href="#overview" onClick={onCloseMenu} className="inline-block rounded-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/25">
                            <p className="text-xs font-bold uppercase tracking-wide text-brand-main">Glucosa App</p>
                            <h1 className="truncate text-lg font-black text-slate-950 sm:text-xl">Registro clínico</h1>
                        </a>
                        <p className="mt-1 truncate text-sm font-black uppercase tracking-wide text-brand-main">{userName}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onToggleMenu}
                        aria-expanded={menuOpen}
                        aria-controls="main-menu"
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-brand-accent/25"
                    >
                        <span className="relative h-5 w-5" aria-hidden="true">
                            <span className={`absolute left-0 top-1/2 h-0.5 w-5 rounded bg-slate-800 transition-transform ${menuOpen ? 'rotate-45' : '-translate-y-2'}`} />
                            <span className={`absolute left-0 top-1/2 h-0.5 w-5 rounded bg-slate-800 transition-opacity ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
                            <span className={`absolute left-0 top-1/2 h-0.5 w-5 rounded bg-slate-800 transition-transform ${menuOpen ? '-rotate-45' : 'translate-y-2'}`} />
                        </span>
                        {menuOpen ? 'Cerrar' : 'Menú'}
                    </button>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-x-0 bottom-0 top-[98px] z-[80] bg-brand-main/90 backdrop-blur-md">
                    <div
                        id="main-menu"
                        className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto p-5 text-white sm:p-8"
                    >
                        <div id="account" className="mb-5 rounded-lg border border-white/20 bg-white/15 p-4 shadow-lg">
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-100">Datos del usuario</p>
                            <p className="mt-1 text-2xl font-black uppercase">{userName}</p>
                            <p className="text-sm text-sky-100">{user?.username}</p>
                        </div>

                        <nav aria-label="Menú principal" className="space-y-2 overflow-y-auto pb-8">
                            <MenuLink href="#overview" onClick={onCloseMenu}>Dashboard de historial</MenuLink>
                            <MenuLink href="#measurement-form" onClick={onCloseMenu}>Registrar medición</MenuLink>
                            <MenuLink href="#history" onClick={onCloseMenu}>Historial completo</MenuLink>
                            <MenuLink href="#filters" onClick={onCloseMenu}>Filtros por período</MenuLink>
                            <button
                                type="button"
                                onClick={onPrint}
                                className="block min-h-12 w-full rounded-lg px-4 py-3 text-left text-base font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/30"
                            >
                                Imprimir historial
                            </button>
                        </nav>

                        <div className="mt-auto border-t border-white/20 pt-4">
                            <button
                                type="button"
                                onClick={onLogout}
                                className="min-h-12 w-full rounded-lg border border-white/40 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/30"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const SummaryHero = ({ stats, measurements, filters }) => (
    <section id="overview" className="scroll-mt-20 rounded-lg border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-5 text-slate-950 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
                <p className="text-sm font-semibold text-brand-main">{formatPeriod(filters)}</p>
                <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Resumen de glucosa</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Revisá tus valores recientes y registrá una nueva medición cuando lo necesites.
                </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Última medición</p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                    <p className="text-4xl font-black leading-none">{stats.last ? stats.last.glucose_value : '-'}</p>
                    <p className="pb-1 text-base font-bold text-slate-500">{stats.last?.unit || ''}</p>
                    {stats.last && <StatusPill measurement={stats.last} />}
                </div>
                <p className="mt-3 text-xs text-slate-500">{measurements.length} registros visibles</p>
            </div>
        </div>
    </section>
);

const StatsGrid = ({ stats, measurements }) => (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Promedio" value={stats.average} helper={stats.unitLabel} />
        <StatCard label="Mínimo" value={stats.min} helper={stats.unitLabel} />
        <StatCard label="Máximo" value={stats.max} helper={stats.unitLabel} />
        <StatCard
            label="Fuera de rango"
            value={stats.outOfRange}
            helper={`de ${measurements.length} registros`}
            tone={stats.outOfRange ? 'danger' : 'success'}
        />
    </section>
);

const TrendChart = ({ measurements }) => {
    const points = measurements
        .slice()
        .reverse()
        .slice(-12)
        .map((measurement) => ({
            value: Number(measurement.glucose_value),
            label: `${measurement.date} ${measurement.time}`,
            unit: measurement.unit || 'mg/dL'
        }));

    if (points.length < 2) {
        return (
            <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm leading-6 text-slate-500">
                Registrá al menos dos mediciones para ver una tendencia.
            </div>
        );
    }

    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 640;
    const height = 190;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const coordinates = points.map((point, index) => {
        const x = padding + (index / (points.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - min) / range) * chartHeight;
        return { ...point, x, y };
    });

    const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full sm:h-52" role="img" aria-label="Tendencia de glucosa">
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#CBD5E1" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#CBD5E1" />
                <text x={padding} y={padding - 9} fill="#475569" fontSize="12">{max}</text>
                <text x={padding} y={height - 9} fill="#475569" fontSize="12">{min}</text>
                <path d={path} fill="none" stroke="#0367A6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {coordinates.map((point) => {
                    const status = getStatus({ glucose_value: point.value, unit: point.unit });
                    const fill = status.label === 'En rango' ? '#059669' : status.label === 'Alto' ? '#DC2626' : '#D97706';
                    return (
                        <g key={point.label}>
                            <circle cx={point.x} cy={point.y} r="6" fill={fill} stroke="#ffffff" strokeWidth="2" />
                            <title>{`${point.label}: ${point.value} ${point.unit}`}</title>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const ReportCard = ({ filters, measurements, exporting, onExportPdf }) => (
    <section id="report" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reporte</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Tendencia e informe</h2>
                <p className="mt-1 text-sm text-slate-500">{formatPeriod(filters)} · {measurements.length} registros</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Para imprimir un período específico, el rango debe cubrir al menos un mes.</p>
            </div>
            <button
                type="button"
                onClick={onExportPdf}
                disabled={exporting || measurements.length === 0}
                className="min-h-12 rounded-lg bg-brand-main px-5 py-3 text-sm font-black text-white transition hover:bg-brand-accent focus:outline-none focus:ring-4 focus:ring-brand-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {exporting ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
        </div>
        <div className="mt-5">
            <TrendChart measurements={measurements} />
        </div>
    </section>
);

const PhotoReader = ({
    photoPreview,
    photoResult,
    analyzingPhoto,
    onPhotoChange,
    onClearPhoto
}) => (
    <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-emerald-700">+</div>
            <div>
                <h3 className="text-base font-black text-slate-900">Tomar foto del medidor</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Subí o capturá una foto del glucómetro. Después confirmá o corregí el valor.</p>
            </div>
        </div>
        <label className="block">
            <span className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 focus-within:ring-4 focus-within:ring-emerald-200">
                Tomar foto o subir imagen
            </span>
            <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                onChange={onPhotoChange}
                className="sr-only"
            />
        </label>

        {photoPreview && (
            <div className="space-y-3">
                <img src={photoPreview} alt="Foto del glucómetro" className="max-h-56 w-full rounded-lg border border-slate-200 object-cover" />
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-6 text-slate-600">
                        {analyzingPhoto ? 'Analizando imagen...' : photoResult?.glucose_value ? `Detectado: ${photoResult.glucose_value} ${photoResult.unit}` : 'Ingresá el valor manualmente si hace falta.'}
                    </p>
                    <button type="button" onClick={onClearPhoto} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-brand-accent/25">
                        Quitar
                    </button>
                </div>
                {photoResult && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                        Confianza: {Math.round((photoResult.confidence || 0) * 100)}%. Confirmá o corregí antes de guardar.
                    </div>
                )}
            </div>
        )}
    </div>
);

const MeasurementForm = ({
    formData,
    editingId,
    saving,
    photoPreview,
    photoResult,
    analyzingPhoto,
    onChange,
    onSubmit,
    onCancel,
    onPhotoChange,
    onClearPhoto
}) => (
    <form id="measurement-form" onSubmit={onSubmit} className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-main">{editingId ? 'Corrección' : 'Registro rápido'}</p>
            <h2 className="text-xl font-black text-slate-950">{editingId ? 'Editar medición' : 'Nueva medición'}</h2>
        </div>

        <div className="mt-5 space-y-4">
            <PhotoReader
                photoPreview={photoPreview}
                photoResult={photoResult}
                analyzingPhoto={analyzingPhoto}
                onPhotoChange={onPhotoChange}
                onClearPhoto={onClearPhoto}
            />

            <div>
                <label htmlFor="glucose_value" className="block text-sm font-bold text-slate-700">Valor de glucosa</label>
                <input
                    id="glucose_value"
                    name="glucose_value"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="1"
                    value={formData.glucose_value}
                    onChange={onChange}
                    className={inputClass}
                    placeholder="Ej. 110"
                    required
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="measurement_date" className="block text-sm font-bold text-slate-700">Fecha</label>
                    <input
                        id="measurement_date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={onChange}
                        className={inputClass}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="measurement_time" className="block text-sm font-bold text-slate-700">Hora</label>
                    <input
                        id="measurement_time"
                        name="time"
                        type="time"
                        value={formData.time}
                        onChange={onChange}
                        className={inputClass}
                        required
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="measurement_unit" className="block text-sm font-bold text-slate-700">Unidad</label>
                    <select id="measurement_unit" name="unit" value={formData.unit} onChange={onChange} className={inputClass}>
                        <option value="mg/dL">mg/dL</option>
                        <option value="mmol/L">mmol/L</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="measurement_context" className="block text-sm font-bold text-slate-700">Contexto</label>
                    <select id="measurement_context" name="context" value={formData.context} onChange={onChange} className={inputClass}>
                        {contextOptions.map((option) => (
                            <option key={option || 'none'} value={option}>{option || 'Sin contexto'}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="measurement_notes" className="block text-sm font-bold text-slate-700">Notas</label>
                <textarea
                    id="measurement_notes"
                    name="notes"
                    value={formData.notes}
                    onChange={onChange}
                    rows="3"
                    maxLength="500"
                    className={`${inputClass} resize-y`}
                    placeholder="Opcional"
                />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="submit"
                    disabled={saving}
                    className="min-h-12 flex-1 rounded-lg bg-brand-main px-5 py-3 text-base font-black text-white transition hover:bg-brand-accent focus:outline-none focus:ring-4 focus:ring-brand-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? 'Guardando...' : editingId ? 'Actualizar medición' : 'Guardar medición'}
                </button>
                {editingId && (
                    <button type="button" onClick={onCancel} className={secondaryButtonClass}>
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    </form>
);

const HistoryFilters = ({ filters, onChange, onApply, onClear }) => (
    <form onSubmit={onApply} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <div>
            <label htmlFor="filter_from" className="block text-sm font-bold text-slate-700">Desde</label>
            <input id="filter_from" name="from" type="date" value={filters.from} onChange={onChange} className={inputClass} />
        </div>
        <div>
            <label htmlFor="filter_to" className="block text-sm font-bold text-slate-700">Hasta</label>
            <input id="filter_to" name="to" type="date" value={filters.to} onChange={onChange} className={inputClass} />
        </div>
        <button type="submit" className="min-h-12 self-end rounded-lg bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300">
            Filtrar
        </button>
        <button type="button" onClick={onClear} className={`${secondaryButtonClass} self-end`}>
            Limpiar
        </button>
    </form>
);

const MeasurementCard = ({ measurement, onEdit, onDelete }) => (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-sm font-bold text-slate-500">{measurement.date} · {measurement.time}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{measurement.glucose_value} <span className="text-base text-slate-500">{measurement.unit || 'mg/dL'}</span></p>
            </div>
            <StatusPill measurement={measurement} />
        </div>

        <dl className="mt-4 grid gap-3 text-sm">
            <div>
                <dt className="font-bold text-slate-500">Contexto</dt>
                <dd className="mt-1 text-slate-800">{measurement.context || '-'}</dd>
            </div>
            <div>
                <dt className="font-bold text-slate-500">Notas</dt>
                <dd className="mt-1 break-words text-slate-800">{measurement.notes || '-'}</dd>
            </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onEdit(measurement)} className={secondaryButtonClass}>
                Editar
            </button>
            <button
                type="button"
                onClick={() => onDelete(measurement.id)}
                className="min-h-11 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
                Eliminar
            </button>
        </div>
    </article>
);

const HistoryTable = ({ measurements, onEdit, onDelete }) => (
    <div className="hidden lg:block">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
                <tr>
                    <th className="px-5 py-3 font-bold">Fecha</th>
                    <th className="px-5 py-3 font-bold">Hora</th>
                    <th className="px-5 py-3 font-bold">Valor</th>
                    <th className="px-5 py-3 font-bold">Estado</th>
                    <th className="px-5 py-3 font-bold">Contexto</th>
                    <th className="px-5 py-3 font-bold">Notas</th>
                    <th className="px-5 py-3 font-bold">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {measurements.map((measurement) => (
                    <tr key={measurement.id} className="align-top">
                        <td className="px-5 py-4 text-slate-900">{measurement.date}</td>
                        <td className="px-5 py-4 text-slate-700">{measurement.time}</td>
                        <td className="px-5 py-4 font-black text-slate-900">{measurement.glucose_value} {measurement.unit || 'mg/dL'}</td>
                        <td className="px-5 py-4"><StatusPill measurement={measurement} /></td>
                        <td className="px-5 py-4 text-slate-700">{measurement.context || '-'}</td>
                        <td className="max-w-[240px] px-5 py-4 text-slate-700">{measurement.notes || '-'}</td>
                        <td className="px-5 py-4">
                            <div className="flex gap-2">
                                <button type="button" onClick={() => onEdit(measurement)} className={secondaryButtonClass}>Editar</button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(measurement.id)}
                                    className="min-h-11 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const HistorySection = ({
    measurements,
    filters,
    loading,
    onFilterChange,
    onApplyFilters,
    onClearFilters,
    onEdit,
    onDelete
}) => (
    <section id="history" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-main">Historial</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Mediciones registradas</h2>
            </div>

            <div id="filters" className="scroll-mt-24">
                <HistoryFilters filters={filters} onChange={onFilterChange} onApply={onApplyFilters} onClear={onClearFilters} />
            </div>
        </div>

        <div className="mt-5">
            {loading && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Cargando historial...
                </div>
            )}

            {!loading && measurements.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="font-bold text-slate-800">Todavía no hay mediciones visibles.</p>
                    <p className="mt-2 text-sm text-slate-500">Guardá una medición o ajustá el período filtrado.</p>
                </div>
            )}

            {!loading && measurements.length > 0 && (
                <>
                    <div className="space-y-3 lg:hidden">
                        {measurements.map((measurement) => (
                            <MeasurementCard key={measurement.id} measurement={measurement} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                    </div>
                    <HistoryTable measurements={measurements} onEdit={onEdit} onDelete={onDelete} />
                </>
            )}
        </div>
    </section>
);

const FeedbackMessage = ({ message, error }) => {
    if (!message && !error) return null;

    return (
        <div className={`rounded-lg px-4 py-3 text-sm font-bold ${error ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`} role="status">
            {error || message}
        </div>
    );
};

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [measurements, setMeasurements] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [filters, setFilters] = useState({ from: '', to: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [photoPreview, setPhotoPreview] = useState('');
    const [photoResult, setPhotoResult] = useState(null);
    const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const fetchMeasurements = async (nextFilters = filters) => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/measurements', { params: buildFilterParams(nextFilters) });
            setMeasurements(data);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'No se pudo cargar el historial.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        const loadInitialMeasurements = async () => {
            try {
                const { data } = await api.get('/measurements');
                if (active) setMeasurements(data);
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'No se pudo cargar el historial.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadInitialMeasurements();

        return () => {
            active = false;
        };
    }, []);

    const stats = useMemo(() => {
        if (measurements.length === 0) {
            return { average: '-', min: '-', max: '-', last: null, outOfRange: 0, unitLabel: '' };
        }

        const values = measurements.map((measurement) => Number(measurement.glucose_value));
        const sum = values.reduce((total, value) => total + value, 0);
        const outOfRange = measurements.filter((measurement) => getStatus(measurement).label !== 'En rango').length;
        const units = [...new Set(measurements.map((measurement) => measurement.unit || 'mg/dL'))];
        const unitLabel = units.length > 1 ? 'unidades mixtas' : units[0];

        return {
            average: Math.round((sum / values.length) * 10) / 10,
            min: Math.min(...values),
            max: Math.max(...values),
            last: measurements[0],
            outOfRange,
            unitLabel
        };
    }, [measurements]);

    const handleChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleFilterChange = (event) => {
        setFilters({ ...filters, [event.target.name]: event.target.value });
    };

    const resetForm = () => {
        setFormData({ ...initialForm, date: getToday(), time: getNowTime() });
        setEditingId(null);
        setPhotoResult(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (editingId) {
                const { data } = await api.put(`/measurements/${editingId}`, formData);
                setMeasurements((current) => current.map((item) => item.id === editingId ? data.measurement : item));
                setMessage('Medición actualizada correctamente.');
            } else {
                const { data } = await api.post('/measurements', formData);
                setMeasurements((current) => [data.measurement, ...current]);
                setMessage('Medición guardada correctamente.');
            }
            resetForm();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'No se pudo guardar la medición.');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (measurement) => {
        setEditingId(measurement.id);
        setFormData({
            glucose_value: measurement.glucose_value,
            date: measurement.date,
            time: measurement.time,
            unit: measurement.unit || 'mg/dL',
            context: measurement.context || '',
            notes: measurement.notes || ''
        });
        setMessage('');
        setError('');
        document.getElementById('measurement-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleDelete = async (measurementId) => {
        const confirmed = window.confirm('¿Querés eliminar esta medición?');
        if (!confirmed) return;

        setError('');
        setMessage('');
        try {
            await api.delete(`/measurements/${measurementId}`);
            setMeasurements((current) => current.filter((measurement) => measurement.id !== measurementId));
            setMessage('Medición eliminada.');
            if (editingId === measurementId) resetForm();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'No se pudo eliminar la medición.');
        }
    };

    const applyFilters = (event) => {
        event.preventDefault();
        fetchMeasurements();
    };

    const clearFilters = () => {
        const emptyFilters = { from: '', to: '' };
        setFilters(emptyFilters);
        fetchMeasurements(emptyFilters);
    };

    const handleExportPdf = async () => {
        const reportValidationError = getReportValidationError(filters);
        if (reportValidationError) {
            setError(reportValidationError);
            setMessage('');
            setMenuOpen(false);
            return;
        }

        setExporting(true);
        setError('');
        setMessage('');
        setMenuOpen(false);

        try {
            const response = await api.get('/measurements/report/pdf', {
                params: buildFilterParams(filters),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'informe-glucosa.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setMessage('Informe PDF generado correctamente.');
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'No se pudo generar el informe PDF.');
        } finally {
            setExporting(false);
        }
    };

    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handlePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        setMessage('');
        setPhotoResult(null);

        if (!file.type.startsWith('image/')) {
            setError('Seleccioná una imagen válida.');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            setError('La imagen es demasiado grande. Usá una foto menor a 8 MB.');
            return;
        }

        try {
            const imageData = await readFileAsDataUrl(file);
            setPhotoPreview(imageData);
            setAnalyzingPhoto(true);

            const { data } = await api.post('/measurements/photo/analyze', { imageData });
            setPhotoResult(data);

            const currentDateTime = getCurrentDateTime();
            setFormData((current) => ({
                ...current,
                glucose_value: data.glucose_value ?? current.glucose_value,
                unit: data.unit || current.unit,
                date: current.date || currentDateTime.date,
                time: current.time || currentDateTime.time,
                notes: data.glucose_value
                    ? [current.notes, `Lectura desde foto. Confianza aproximada: ${Math.round((data.confidence || 0) * 100)}%.`].filter(Boolean).join(' ')
                    : current.notes
            }));
            setMessage(data.message || 'Imagen analizada. Revisá los datos antes de guardar.');
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'No se pudo analizar la foto.');
        } finally {
            setAnalyzingPhoto(false);
            event.target.value = '';
        }
    };

    const clearPhoto = () => {
        setPhotoPreview('');
        setPhotoResult(null);
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950">
            <DashboardHeader
                user={user}
                menuOpen={menuOpen}
                onToggleMenu={() => setMenuOpen((open) => !open)}
                onCloseMenu={() => setMenuOpen(false)}
                onLogout={logout}
                onPrint={handleExportPdf}
            />

            <div className="mx-auto max-w-7xl space-y-4 px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-6">
                <SummaryHero stats={stats} measurements={measurements} filters={filters} />
                <StatsGrid stats={stats} measurements={measurements} />
                <FeedbackMessage message={message} error={error} />

                <div className="grid gap-4 xl:grid-cols-[minmax(360px,430px)_1fr] xl:items-start">
                    <div className="space-y-4 xl:sticky xl:top-24">
                        <MeasurementForm
                            formData={formData}
                            editingId={editingId}
                            saving={saving}
                            photoPreview={photoPreview}
                            photoResult={photoResult}
                            analyzingPhoto={analyzingPhoto}
                            onChange={handleChange}
                            onSubmit={handleSubmit}
                            onCancel={resetForm}
                            onPhotoChange={handlePhotoChange}
                            onClearPhoto={clearPhoto}
                        />
                        <ReportCard
                            filters={filters}
                            measurements={measurements}
                            exporting={exporting}
                            onExportPdf={handleExportPdf}
                        />
                    </div>

                    <HistorySection
                        measurements={measurements}
                        filters={filters}
                        loading={loading}
                        onFilterChange={handleFilterChange}
                        onApplyFilters={applyFilters}
                        onClearFilters={clearFilters}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>

                <p className="rounded-lg bg-white px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm">
                    Tus mediciones son datos sensibles de salud. Revisá cada registro antes de guardarlo y consultá a un profesional ante valores fuera de rango o síntomas. Esta app no reemplaza consejo médico.
                </p>
            </div>
        </main>
    );
};

export default Dashboard;
