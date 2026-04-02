import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  accentColor: 'green' | 'purple' | 'amber' | 'red';
  sparkData?: number[];
}

const accentVarMap: Record<KPICardProps['accentColor'], string> = {
  green: 'var(--hc-green)',
  purple: 'var(--hc-purple)',
  amber: 'var(--hc-amber)',
  red: 'var(--hc-red)',
};

const deltaColorMap: Record<NonNullable<KPICardProps['deltaType']>, string> = {
  up: 'text-hc-green',
  down: 'text-hc-red',
  neutral: 'text-hc-amber',
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  delta,
  deltaType = 'neutral',
  accentColor,
  sparkData,
}) => {
  const accentVar = accentVarMap[accentColor];
  const sparkPoints = sparkData?.map((v, i) => ({ i, v })) ?? [];

  return (
    <div
      className="bg-hc-card border border-hc-border rounded-xl p-4 flex flex-col gap-2 transition-shadow duration-200 hover:shadow-md"
      style={{ borderTop: `2px solid ${accentVar}`, boxShadow: 'var(--hc-shadow)' }}
      aria-label={`KPI: ${label}`}
    >
      <p className="text-[11px] text-hc-muted uppercase tracking-widest font-medium">{label}</p>
      <p className="text-2xl font-semibold font-display text-hc-text leading-none">{value}</p>
      {delta && (
        <p className={`text-[11px] font-medium ${deltaColorMap[deltaType]}`}>{delta}</p>
      )}
      {sparkPoints.length > 0 && (
        <div className="mt-1" aria-hidden="true">
          <ResponsiveContainer width="100%" height={32}>
            <LineChart data={sparkPoints}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={accentVar}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
