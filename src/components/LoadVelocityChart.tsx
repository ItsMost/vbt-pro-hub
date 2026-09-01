import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import type { VBTDataPoint } from '../utils/vbtEngine';
import { cn } from '../utils/cn';

interface LoadVelocityChartProps {
  points: VBTDataPoint[];
  slope: number;
  intercept: number;
  mvt: number;
  estimated1RM: number;
  exerciseName?: string;
  colorTheme?: 'cyan' | 'lime' | 'emerald' | 'neon';
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isMeasured = data.measuredVelocity !== undefined && data.measuredVelocity !== null;
    const load = data.load;
    const velocity = isMeasured ? data.measuredVelocity : data.trendVelocity;

    return (
      <div className="glass-panel p-3 rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl text-xs font-mono">
        <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
          {isMeasured ? '🎯 Measured Test Set' : '📈 OLS Regression Point'}
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-200">
          <span>Barbell Load:</span>
          <span className="font-bold text-white text-sm">{load} kg</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-200 mt-1">
          <span>Mean Velocity:</span>
          <span className="font-bold text-cyan-400 text-sm">{velocity?.toFixed(2)} m/s</span>
        </div>
        {isMeasured && data.trendVelocity && (
          <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px] mt-1 pt-1 border-t border-slate-800">
            <span>Regression Model:</span>
            <span>{data.trendVelocity.toFixed(2)} m/s</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const LoadVelocityChart: React.FC<LoadVelocityChartProps> = ({
  points,
  slope,
  intercept,
  mvt,
  estimated1RM,
  colorTheme = 'cyan',
  className = '',
}) => {
  const isCyan = colorTheme === 'cyan';
  const strokeColor = isCyan ? '#06b6d4' : '#10b981';
  const dotFill = isCyan ? '#22d3ee' : '#34d399';

  // Build combined dataset
  const maxLoad = Math.max(
    estimated1RM > 0 ? estimated1RM + 15 : 140,
    ...points.map(p => p.load + 15)
  );

  const chartDataMap: Map<number, { load: number; trendVelocity: number; measuredVelocity?: number }> = new Map();

  for (let load = 20; load <= maxLoad; load += 5) {
    if (slope < 0) {
      const v = slope * load + intercept;
      if (v >= 0.05) {
        chartDataMap.set(load, {
          load,
          trendVelocity: Math.round(v * 100) / 100
        });
      }
    }
  }

  // Include actual measured points
  for (const pt of points) {
    if (pt.load > 0 && pt.velocity > 0) {
      const existing = chartDataMap.get(pt.load);
      const trendV = slope < 0 ? slope * pt.load + intercept : pt.velocity;
      if (existing) {
        existing.measuredVelocity = pt.velocity;
      } else {
        chartDataMap.set(pt.load, {
          load: pt.load,
          trendVelocity: Math.round(trendV * 100) / 100,
          measuredVelocity: pt.velocity
        });
      }
    }
  }

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.load - b.load);

  return (
    <div className={cn("w-full flex flex-col justify-between", className)}>
      
      {/* Chart Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-glow-cyan"></span>
            <span className="text-slate-300">Measured Sets ({points.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-cyan-500/80"></span>
            <span className="text-slate-400">Regression Line (L-V)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-rose-300">
            MVT: <strong className="text-white">{mvt.toFixed(2)} m/s</strong>
          </span>
          {estimated1RM > 0 && (
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
              1RM: {estimated1RM} kg
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="w-full h-72 sm:h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 25, bottom: 20, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.05)"
              vertical={false}
            />

            <XAxis
              dataKey="load"
              type="number"
              domain={[10, 'dataMax + 10']}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
              unit="kg"
            />

            <YAxis
              dataKey="trendVelocity"
              domain={[0, 1.4]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
              unit=" m/s"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* MVT Horizontal Line */}
            <ReferenceLine
              y={mvt}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `MVT (${mvt.toFixed(2)} m/s)`,
                fill: '#f43f5e',
                fontSize: 10,
                position: 'insideBottomRight',
                offset: 5,
                fontFamily: 'monospace'
              }}
            />

            {/* 1RM Vertical Line */}
            {estimated1RM > 0 && (
              <ReferenceLine
                x={estimated1RM}
                stroke="#06b6d4"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `1RM (${estimated1RM}kg)`,
                  fill: '#06b6d4',
                  fontSize: 10,
                  position: 'top',
                  fontFamily: 'monospace'
                }}
              />
            )}

            {/* 1RM Intersection Dot */}
            {estimated1RM > 0 && (
              <ReferenceDot
                x={estimated1RM}
                y={mvt}
                r={5}
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}

            {/* Linear Regression Trend Line */}
            <Line
              type="linear"
              dataKey="trendVelocity"
              stroke={strokeColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              name="L-V Profile"
            />

            {/* Measured Data Points Scatter */}
            <Scatter
              dataKey="measuredVelocity"
              fill={dotFill}
              stroke="#0f172a"
              strokeWidth={2}
              name="Measured Set"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
