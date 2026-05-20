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

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
      <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">R:R 계산기</div>
      <p className="text-xs text-zinc-600 mb-4">계좌 리스크 한도 내에서 수량·포지션 규모를 자동 계산합니다. 수치는 직접 수정 가능.</p>

      {/* 공통 입력 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">계좌 규모 ($)</label>
          <input
            type="number"
            value={rrAccount}
            onChange={(e) => setRrAccount(e.target.value)}
            step="1000"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">리스크 % (계좌 대비)</label>
          <input
            type="number"
            value={rrRiskPct}
            onChange={(e) => setRrRiskPct(e.target.value)}
            step="0.5"
            min="0.5"
            max="5"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="col-span-2 text-xs text-zinc-600 -mt-1">
          리스크 금액: <span className="text-zinc-400 font-semibold">{riskDollar ? `$${riskDollar.toFixed(0)}` : '—'}</span>
          &nbsp;(계좌의 {rrRiskPct}% — 이 금액만 날릴 각오로 진입)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 시나리오 A: 즉시 진입 */}
        <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300">시나리오 A</span>
            <span className="text-xs text-zinc-300 font-medium">지금 바로 매수</span>
          </div>
          <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
            현재가에 즉시 진입. 추세가 이미 시작됐다고 판단할 때 사용.
            <br />
            <span className="text-amber-400/80">단점: 돌파 확인 없이 진입하므로 실패 시 손절 빈도 높음.</span>
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '진입가', value: rrNowEntry, set: setRrNowEntry, color: 'focus:border-blue-500' },
              { label: '손절가', value: rrNowStop, set: setRrNowStop, color: 'focus:border-red-500' },
              { label: '목표가', value: rrNowTarget, set: setRrNowTarget, color: 'focus:border-emerald-500' },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  step="0.01"
                  className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none ${color}`}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">R:R 비율</div>
              <div
                className={`font-bold text-base ${
                  now.ratio && now.ratio >= 2
                    ? 'text-emerald-400'
                    : now.ratio
                    ? 'text-yellow-400'
                    : 'text-zinc-400'
                }`}
              >
                {now.ratio ? `1 : ${now.ratio.toFixed(2)}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">매수 수량</div>
              <div className="font-bold text-base text-blue-400">{now.shares != null ? now.shares.toLocaleString() : '—'} 주</div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">포지션 규모</div>
              <div className="font-bold text-base text-zinc-200">
                {now.posSize ? `$${now.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">예상 수익</div>
              <div className="font-bold text-base text-emerald-400">
                {now.profit ? `+$${now.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* 시나리오 B: 피벗 돌파 진입 */}
        <div className="bg-zinc-800/60 rounded-xl border border-amber-500/25 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">시나리오 B</span>
            <span className="text-xs text-zinc-300 font-medium">피벗 돌파 후 진입 (권장)</span>
          </div>
          <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
            20일 최고가({pivotHigh ? `$${pivotHigh.toFixed(2)}` : '—'}) + 0.5% 돌파 시 매수.
            <br />
            <span className="text-emerald-400/80">장점: 거래량·모멘텀 확인 후 진입 → 성공률·R:R 모두 유리.</span>
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '진입가 (피벗)', value: rrEntry, set: setRrEntry, color: 'focus:border-amber-500' },
              { label: '손절가', value: rrStop, set: setRrStop, color: 'focus:border-red-500' },
              { label: '목표가 (3R)', value: rrTarget, set: setRrTarget, color: 'focus:border-emerald-500' },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  step="0.01"
                  className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none ${color}`}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">R:R 비율</div>
              <div
                className={`font-bold text-base ${
                  pivot.ratio && pivot.ratio >= 2
                    ? 'text-emerald-400'
                    : pivot.ratio
                    ? 'text-yellow-400'
                    : 'text-zinc-400'
                }`}
              >
                {pivot.ratio ? `1 : ${pivot.ratio.toFixed(2)}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">매수 수량</div>
              <div className="font-bold text-base text-amber-400">{pivot.shares != null ? pivot.shares.toLocaleString() : '—'} 주</div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">포지션 규모</div>
              <div className="font-bold text-base text-zinc-200">
                {pivot.posSize ? `$${pivot.posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-zinc-500 mb-0.5">예상 수익</div>
              <div className="font-bold text-base text-emerald-400">
                {pivot.profit ? `+$${pivot.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
