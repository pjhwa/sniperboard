'use client';

export type IndicatorKey = 'rsi' | 'macd' | 'bb' | 'atr' | 'vwap';
export type DrawingTool = 'trendline' | 'fibonacci' | 'hline';

export interface IndicatorToggles {
  rsi: boolean;
  macd: boolean;
  bb: boolean;
  atr: boolean;
  vwap: boolean;
}

const INDS: { key: IndicatorKey; label: string }[] = [
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'bb', label: 'BB' },
  { key: 'atr', label: 'ATR' },
  { key: 'vwap', label: 'VWAP' },
];

const TOOLS: { key: DrawingTool; label: string }[] = [
  { key: 'trendline', label: 'Trend' },
  { key: 'fibonacci', label: 'Fib' },
  { key: 'hline', label: 'H-Line' },
];

export function ChartToolbar({
  toggles,
  onToggle,
  tool,
  onTool,
  onClear,
}: {
  toggles: IndicatorToggles;
  onToggle: (k: IndicatorKey) => void;
  tool: DrawingTool | null;
  onTool: (t: DrawingTool | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="chart-toolbar">
      {INDS.map((ind) => (
        <button
          key={ind.key}
          type="button"
          className={toggles[ind.key] ? 'on' : ''}
          onClick={() => onToggle(ind.key)}
        >
          {ind.label}
        </button>
      ))}
      <span className="chart-toolbar__sep" />
      {TOOLS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={tool === t.key ? 'on' : ''}
          onClick={() => onTool(tool === t.key ? null : t.key)}
        >
          {t.label}
        </button>
      ))}
      <button type="button" onClick={onClear}>Clear</button>
    </div>
  );
}
