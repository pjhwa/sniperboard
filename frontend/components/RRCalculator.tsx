import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../hooks/useStore';

interface RRCalculatorProps {
  defaultEntry: number;
  defaultStop: number;
  defaultTarget: number;
  latestClose: number;
  latestAtr: number;
  pivotHigh: number;
}

export default function RRCalculator({
  defaultEntry,
  defaultStop,
  defaultTarget,
  latestClose,
  latestAtr,
  pivotHigh
}: RRCalculatorProps) {
  const { rrAccount, rrRiskPct, setRrAccount, setRrRiskPct } = useDashboardStore();

  // 시나리오 A: 즉시 진입 (현재가 기준)
  const [rrNowEntry, setRrNowEntry] = useState(String(latestClose));
  const [rrNowStop, setRrNowStop] = useState(String(Math.round((latestClose - 2 * latestAtr) * 100) / 100));
  const [rrNowTarget, setRrNowTarget] = useState(
    String(Math.round((latestClose + 3 * (latestClose - (latestClose - 2 * latestAtr))) * 100) / 100)
  );

  // 시나리오 B: 피벗 돌파 진입 (권장)
  const [rrEntry, setRrEntry] = useState(String(defaultEntry));
  const [rrStop, setRrStop] = useState(String(defaultStop));
  const [rrTarget, setRrTarget] = useState(String(defaultTarget));

  useEffect(() => {
    setRrEntry(String(defaultEntry));
    setRrStop(String(defaultStop));
    setRrTarget(String(defaultTarget));

    const nowEntry = latestClose;
    const nowStop = Math.round((nowEntry - 2 * latestAtr) * 100) / 100;
    const riskPS = nowEntry - nowStop;
    const nowTarget = Math.round((nowEntry + 3 * riskPS) * 100) / 100;

    setRrNowEntry(String(nowEntry));
    setRrNowStop(String(nowStop));
    setRrNowTarget(String(nowTarget));
  }, [defaultEntry, defaultStop, defaultTarget, latestClose, latestAtr]);

  const rrAccN = parseFloat(rrAccount);
  const rrRiskN = parseFloat(rrRiskPct);
  const riskDollar = !isNaN(rrAccN) && !isNaN(rrRiskN) ? (rrAccN * rrRiskN) / 100 : null;

  function calcRR(entryStr: string, stopStr: string, targetStr: string) {
    const e = parseFloat(entryStr);
    const s = parseFloat(stopStr);
    const t = parseFloat(targetStr);
    const riskPS = !isNaN(e) && !isNaN(s) ? e - s : null;
    const reward = !isNaN(e) && !isNaN(t) ? t - e : null;
    const ratio = riskPS && reward && riskPS > 0 ? reward / riskPS : null;
    const shares = riskDollar && riskPS && riskPS > 0 ? Math.floor(riskDollar / riskPS) : null;
    const posSize = shares && !isNaN(e) ? shares * e : null;
    const profit = shares && reward ? shares * reward : null;
    return { e, s, t, riskPS, reward, ratio, shares, posSize, profit };
  }

  const pivot = calcRR(rrEntry, rrStop, rrTarget);
  const now = calcRR(rrNowEntry, rrNowStop, rrNowTarget);

  // R:R 비율 시각화 바 렌더링 헬퍼
  const renderRRBar = (ratio: number | null) => {
    if (!ratio || ratio <= 0 || isNaN(ratio)) return null;
    
    const riskPart = 1;
    const rewardPart = Math.min(Math.max(ratio, 0.5), 10); // 최대 10R까지 매핑
    const total = riskPart + rewardPart;
    const riskPct = (riskPart / total) * 100;
    const rewardPct = (rewardPart / total) * 100;
    
    return (
      <div className="mt-3.5 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
        <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
          <span>손절 리스크 (1.0x)</span>
          <span>진입</span>
          <span>목표 수익 ({ratio.toFixed(2)}x)</span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden flex bg-zinc-950">
          <div className="h-full bg-gradient-to-r from-red-500/80 to-red-500" style={{ width: `${riskPct}%` }} />
          <div className="w-[2px] bg-white h-full z-10" />
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-500/80" style={{ width: `${rewardPct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      
      <div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          R:R 손익비 계산기 (HTS Order Slip)
        </div>
        <p className="text-xs text-zinc-400 mb-4 font-medium leading-relaxed">
          계좌 규모 및 리스크 감수 비율에 맞춰 최적의 매수 수량과 포지션을 계산합니다.
        </p>

        {/* Global Account Configuration */}
        <div className="grid grid-cols-2 gap-3 mb-4.5 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-900">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">계좌 규모 ($)</label>
            <input
              type="number"
              value={rrAccount}
              onChange={(e) => setRrAccount(e.target.value)}
              step="1000"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-zinc-600 transition"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">리스크 % (계좌 대비)</label>
            <input
              type="number"
              value={rrRiskPct}
              onChange={(e) => setRrRiskPct(e.target.value)}
              step="0.5"
              min="0.5"
              max="5"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-zinc-600 transition"
            />
          </div>
          <div className="col-span-2 text-[11px] text-zinc-400 font-medium pt-1 border-t border-zinc-850 mt-1">
            최대 손실 제한액: <span className="text-red-400 font-bold">{riskDollar ? `$${riskDollar.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</span>
            <span className="text-zinc-500"> (허용할 수 있는 최대 리스크 규모)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Scenario A: Immediate Execution */}
        <div className="bg-zinc-900/20 rounded-xl border border-zinc-800/80 p-4 transition-all hover:bg-zinc-900/35 hover:border-zinc-700/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 tracking-wider">
              시나리오 A
            </span>
            <span className="text-xs text-zinc-200 font-bold">즉시 시장가 진입</span>
          </div>
          
          <p className="text-[11px] text-zinc-400 mb-3.5 leading-relaxed font-medium">
            현재 종가 기준 즉시 매수. 진입 대기 시간이 없으나 돌파 확인 실패 리스크가 상존합니다.
          </p>
          
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '진입가', value: rrNowEntry, set: setRrNowEntry, color: 'focus:border-blue-500' },
              { label: '손절가 (2ATR)', value: rrNowStop, set: setRrNowStop, color: 'focus:border-red-500' },
              { label: '목표가 (3R)', value: rrNowTarget, set: setRrNowTarget, color: 'focus:border-emerald-500' },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <label className="text-[9px] font-bold text-zinc-500 mb-1 block uppercase tracking-wider">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  step="0.01"
                  className={`w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none transition ${color}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">R:R 비율</div>
              <div className={`font-bold text-sm ${now.ratio && now.ratio >= 2 ? 'text-emerald-400' : now.ratio ? 'text-yellow-400' : 'text-zinc-400'}`}>
                {now.ratio ? `1 : ${now.ratio.toFixed(2)}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">권장 매수 수량</div>
              <div className="font-bold text-sm text-blue-400">
                {now.shares != null ? now.shares.toLocaleString() : '—'} <span className="text-[10px] text-zinc-500">주</span>
              </div>
            </div>
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">포지션 규모</div>
              <div className="font-bold text-sm text-zinc-300">
                {now.posSize ? `$${now.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">목표 달성시 수익</div>
              <div className="font-bold text-sm text-emerald-400">
                {now.profit ? `+$${now.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          </div>
          
          {renderRRBar(now.ratio)}
        </div>

        {/* Scenario B: Pivot Breakout (Recommended) */}
        <div className="bg-zinc-900/20 rounded-xl border border-amber-500/10 p-4 transition-all hover:bg-zinc-900/35 hover:border-amber-500/25">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 tracking-wider">
              시나리오 B
            </span>
            <span className="text-xs text-zinc-200 font-bold">피벗 돌파 매수 (권장)</span>
          </div>
          
          <p className="text-[11px] text-zinc-400 mb-3.5 leading-relaxed font-medium">
            20일 최고가({pivotHigh ? `$${pivotHigh.toFixed(2)}` : '—'}) +0.5% 지점 돌파 시 진입. 모멘텀이 보장됩니다.
          </p>
          
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '진입가 (피벗)', value: rrEntry, set: setRrEntry, color: 'focus:border-amber-500' },
              { label: '손절가', value: rrStop, set: setRrStop, color: 'focus:border-red-500' },
              { label: '목표가 (3R)', value: rrTarget, set: setRrTarget, color: 'focus:border-emerald-500' },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <label className="text-[9px] font-bold text-zinc-500 mb-1 block uppercase tracking-wider">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  step="0.01"
                  className={`w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none transition ${color}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">R:R 비율</div>
              <div className={`font-bold text-sm ${pivot.ratio && pivot.ratio >= 2 ? 'text-emerald-400' : pivot.ratio ? 'text-yellow-400' : 'text-zinc-400'}`}>
                {pivot.ratio ? `1 : ${pivot.ratio.toFixed(2)}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">권장 매수 수량</div>
              <div className="font-bold text-sm text-amber-400">
                {pivot.shares != null ? pivot.shares.toLocaleString() : '—'} <span className="text-[10px] text-zinc-500">주</span>
              </div>
            </div>
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">포지션 규모</div>
              <div className="font-bold text-sm text-zinc-300">
                {pivot.posSize ? `$${pivot.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-900 p-2">
              <div className="text-[9px] font-bold text-zinc-500 mb-0.5">목표 달성시 수익</div>
              <div className="font-bold text-sm text-emerald-400">
                {pivot.profit ? `+$${pivot.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          </div>
          
          {renderRRBar(pivot.ratio)}
        </div>
      </div>
    </div>
  );
}
