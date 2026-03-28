import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { BotStatus } from '../../services/botService';

interface ComplianceCardProps {
  status: BotStatus | null;
  pendencias: number;
}

type CheckStatus = 'ok' | 'pendente' | 'erro';

interface ComplianceCheck {
  label: string;
  status: CheckStatus;
}

const statusPillClass: Record<CheckStatus, string> = {
  ok: 'bg-green-500/15 text-hc-green',
  pendente: 'bg-amber-500/15 text-hc-amber',
  erro: 'bg-red-500/15 text-hc-red',
};

const statusLabel: Record<CheckStatus, string> = {
  ok: 'OK',
  pendente: 'Pendente',
  erro: 'Erro',
};

export const ComplianceCard: React.FC<ComplianceCardProps> = ({ status, pendencias }) => {
  const checks: ComplianceCheck[] = [
    {
      label: 'SEFAZ Online',
      status: status?.ultima_sincronizacao ? 'ok' : 'erro',
    },
    {
      label: 'Certificados',
      status: (status?.empresas_sem_certificado ?? 0) === 0 ? 'ok' : 'erro',
    },
    {
      label: 'Certs Expirados',
      status: (status?.empresas_cert_expirado ?? 0) === 0 ? 'ok' : 'pendente',
    },
    {
      label: 'Pendências',
      status: pendencias === 0 ? 'ok' : 'pendente',
    },
  ];

  const totalOk = checks.filter((c) => c.status === 'ok').length;
  const percentage = Math.round((totalOk / checks.length) * 100);

  const donutData = [
    { value: totalOk, fill: 'var(--hc-green)' },
    { value: checks.length - totalOk, fill: 'var(--hc-border)' },
  ];

  return (
    <div
      className="bg-hc-card border border-hc-border rounded-xl p-4 flex flex-col gap-4"
      aria-label="Conformidade Fiscal"
    >
      <p className="text-[11px] text-hc-muted uppercase tracking-wide">Conformidade Fiscal</p>

      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 80, height: 80 }}>
          <ResponsiveContainer width={80} height={80}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={36}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold font-display text-hc-text">{percentage}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between">
              <span className="text-[12px] text-hc-muted">{check.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusPillClass[check.status]}`}>
                {statusLabel[check.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
