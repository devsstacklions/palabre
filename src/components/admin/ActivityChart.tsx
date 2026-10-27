import React from 'react';
import { DailyActivity } from '../../services/admin.service';

const series = [
  { key: 'fiches', label: 'Fiches publiées', color: '#0f766e' },
  { key: 'confirmations', label: 'Confirmations', color: '#2563eb' },
  { key: 'variants', label: 'Variantes', color: '#7c3aed' },
  { key: 'reports', label: 'Signalements', color: '#e11d48' },
  { key: 'signups', label: 'Inscriptions', color: '#f59e0b' },
] as const;

const formatDay = (day: string) => new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: 'short', timeZone: 'UTC',
}).format(new Date(`${day}T00:00:00Z`));

export const ActivityChart: React.FC<{ data: DailyActivity[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((day) => series.reduce((sum, item) => sum + day[item.key], 0)));
  const chartTop = 18;
  const chartBottom = 186;
  const chartHeight = chartBottom - chartTop;
  const slot = 50;
  const barWidth = 27;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-semibold">Activité des utilisateurs</h3>
        <p className="mt-1 text-xs text-slate-500">Actions enregistrées par jour · 14 derniers jours</p>
      </div>
      {data.length ? (
        <div className="p-4 sm:p-5">
          <div className="overflow-x-auto">
            <svg
              role="img"
              aria-label="Graphique des inscriptions, fiches publiées, confirmations, variantes et signalements sur les quatorze derniers jours"
              viewBox={`0 0 ${Math.max(720, data.length * slot + 42)} 232`}
              className="h-64 min-w-[680px] w-full"
              preserveAspectRatio="none"
            >
              {[0, 1, 2, 3].map((step) => {
                const y = chartTop + (chartHeight * step) / 3;
                return <line key={step} x1="38" x2={data.length * slot + 30} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />;
              })}
              {data.map((day, index) => {
                const x = 44 + index * slot;
                let y = chartBottom;
                const total = series.reduce((sum, item) => sum + day[item.key], 0);
                const segments = series.map((item) => {
                  const height = (day[item.key] / max) * chartHeight;
                  y -= height;
                  return <rect key={item.key} x={x} y={y} width={barWidth} height={height} fill={item.color}>
                    <title>{`${formatDay(day.day)} · ${item.label} : ${day[item.key]}`}</title>
                  </rect>;
                });
                return (
                  <g key={day.day}>
                    {segments}
                    <text x={x + barWidth / 2} y="209" textAnchor="middle" fontSize="10" fill="#64748b">
                      {index % 2 === 0 || index === data.length - 1 ? formatDay(day.day) : ''}
                    </text>
                    {total > 0 && <title>{`${formatDay(day.day)} · ${total} actions`}</title>}
                  </g>
                );
              })}
            </svg>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Légende du graphique">
            {series.map((item) => (
              <li key={item.key} className="inline-flex items-center gap-2 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="px-5 py-8 text-sm text-slate-500">Aucune activité enregistrée sur cette période.</p>
      )}
    </section>
  );
};
