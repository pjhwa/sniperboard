'use client';

import { useMacro } from '@/hooks/useMacro';
import { Card } from '@/components/ui/Card';
import { MacroItem } from '@/app/types';
import { GlossaryPanel, GlossaryItem } from '@/components/ui/GlossaryPanel';

const MACRO_GLOSSARY: GlossaryItem[] = [
  { term: 'Sector Rotation (섹터 로테이션)', plain: '어떤 업종이 강하고 어떤 업종이 약한지 보여줍니다. 강한 섹터에 돈이 몰리고 있다는 의미이므로, 강세 섹터 내 종목에 집중하는 것이 유리합니다.' },
  { term: 'SMH (반도체 ETF)', plain: '엔비디아, TSMC 등 반도체 기업들로 구성된 ETF입니다. 기술주 강세장의 선행 지표로 활용됩니다.' },
  { term: 'XLY (소비재 ETF)', plain: '아마존, 테슬라 등 경기 민감 소비재 기업들의 ETF입니다. 경기 확장기에 강세를 보입니다.' },
  { term: 'VIX (공포 지수)', plain: '향후 30일간 S&P500의 예상 변동성입니다. 14 이하=안정, 20 전후=경계, 30 이상=공포. 높을수록 시장 참여자들이 불안해하고 있다는 뜻입니다.', color: 'var(--warn)' },
  { term: 'VIX9D (단기 공포 지수)', plain: '향후 9일간 단기 변동성입니다. 정상(콘탱고)은 VIX9D < VIX입니다. VIX9D가 VIX보다 높아지면 "백워데이션" — 단기 이벤트에 대한 공포가 극도로 커진 경고 신호입니다.' },
  { term: 'VVIX (변동성의 변동성)', plain: 'VIX 자체가 얼마나 크게 움직이는지를 나타냅니다. 매우 높으면 시장이 극도로 불확실한 상태입니다.' },
  { term: 'SPY (S&P500 ETF)', plain: '미국 대형주 500개를 시가총액 비례로 담은 ETF입니다. 미국 주식 시장 전체의 건강도를 나타냅니다.' },
  { term: 'RSP (동일가중 S&P500)', plain: 'S&P500 종목을 동일한 비중으로 담은 ETF입니다. SPY와 비교해 RSP가 강하면 다수 종목이 함께 오르는 건강한 장세, 약하면 일부 대형주만 오르는 취약한 장세입니다.' },
  { term: 'IWM (소형주 ETF)', plain: '미국 소형주 2000개로 구성된 ETF입니다. 소형주는 경기에 민감하므로, IWM이 강하면 경기 확장 기대감이 높다는 신호입니다.' },
  { term: 'HYG / JNK (고수익 채권 ETF)', plain: '신용등급이 낮은 기업의 채권으로 구성된 ETF입니다. 고위험 채권이 강하면 투자자들이 위험을 감수할 의향이 있다는 신호(위험 선호)입니다.', color: 'var(--bull)' },
  { term: 'LQD (투자등급 회사채 ETF)', plain: '신용등급이 높은 우량 기업의 채권 ETF입니다. 안전한 회사채 수요가 늘면 주식 시장에서 돈이 이동하고 있다는 뜻입니다.' },
  { term: 'IEF (7-10년 미국 국채 ETF)', plain: '미국 정부 보증 중기 국채 ETF입니다. 시장이 불안할 때 자금이 몰리는 대표적인 안전 자산입니다. IEF가 강하면 위험 회피 심리가 높다는 신호입니다.', color: 'var(--bear)' },
  { term: 'DXY (달러 인덱스)', plain: '미국 달러화의 강도를 나타냅니다. 달러가 강하면 수출 기업 실적이 악화되고 원자재 가격이 눌릴 수 있습니다. 신흥국 증시에도 부정적 영향을 줍니다.' },
  { term: 'TNX (10년 국채 금리)', plain: '미국 10년 만기 국채 수익률입니다. 금리가 오르면 주식 밸류에이션(특히 성장주)이 압박을 받고, 채권이 상대적으로 매력적이 됩니다.' },
  { term: 'TLT (장기 국채 ETF)', plain: '20년 이상 미국 장기 국채 ETF입니다. 금리와 반대로 움직입니다. TLT가 오르면 금리 하락 기대, 내리면 금리 상승 압박을 의미합니다.' },
  { term: 'CL=F (WTI 원유 선물)', plain: '국제 원유 가격입니다. 경기 성장 기대 시 수요 증가로 오르고, 경기 침체 우려 시 내립니다. 급등은 인플레이션 압박 요인이기도 합니다.' },
  { term: 'GLD (금 ETF)', plain: '금 가격을 추종하는 ETF입니다. 불확실성이 높거나 달러 약세 시 강세를 보이는 전통적인 안전 자산입니다.' },
];

const SECTOR_SYMS = ['SMH', 'XLY', 'ITA', 'XLE', 'XHB'];
const SECTOR_NAMES: Record<string, string> = {
  SMH: 'Semiconductors', XLY: 'Consumer Disc.', ITA: 'Aerospace/Def.',
  XLE: 'Energy', XHB: 'Homebuilders',
};

const MACRO_GROUPS: { key: string; label: string; subtitle: string; symbols: string[] }[] = [
  { key: 'volatility', label: '변동성',    subtitle: 'Fear Gauge',   symbols: ['^VIX', '^VIX9D', '^VVIX'] },
  { key: 'breadth',    label: '시장 폭',   subtitle: 'Broad Market', symbols: ['SPY', 'RSP', 'MAGS', 'IWM'] },
  { key: 'credit',     label: '신용 스트레스', subtitle: 'Credit',  symbols: ['HYG', 'JNK', 'LQD', 'IEF'] },
  { key: 'rates',      label: '달러·금리', subtitle: 'Rates/USD',   symbols: ['DX-Y.NYB', '^TNX', 'TLT'] },
  { key: 'commodities',label: '원자재',    subtitle: 'Commodities',  symbols: ['CL=F', 'GLD'] },
  { key: 'sectors',    label: '섹터 ETF',  subtitle: 'Rotation',     symbols: ['SMH', 'XLE', 'XLY', 'XHB', 'ITA'] },
];

function displaySym(s: string) {
  return s.replace('^', '').replace('-Y.NYB', 'Y');
}

export function MacroBoard() {
  const { macroData, isLoading } = useMacro();
  const macro = macroData?.macro ?? [];

  const sectorItems = SECTOR_SYMS.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
  const maxAbs = sectorItems.length ? Math.max(...sectorItems.map(s => Math.abs(s.change_pct_1d ?? 0))) || 1 : 1;

  return (
    <div className="board fade-in" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: 'min-content' }}>
      {/* Sector rotation */}
      <div style={{ gridColumn: 'span 3' }}>
        <Card title="Sector Rotation · 1D" action="섹터별 상대 강도">
          {isLoading ? (
            <div className="subtle">로딩 중...</div>
          ) : (
            <div>
              {[...sectorItems]
                .sort((a, b) => (b.change_pct_1d ?? 0) - (a.change_pct_1d ?? 0))
                .map(s => {
                  const chg = s.change_pct_1d ?? 0;
                  return (
                    <div key={s.symbol} className="sector-bar">
                      <span className="sb-sym">{displaySym(s.symbol)}</span>
                      <span className="sb-name">{SECTOR_NAMES[s.symbol] ?? s.name}</span>
                      <div className="sb-track">
                        {chg >= 0
                          ? <div className="fill-pos" style={{ width: `${(chg / maxAbs) * 48}%` }} />
                          : <div className="fill-neg" style={{ width: `${(Math.abs(chg) / maxAbs) * 48}%` }} />
                        }
                      </div>
                      <span className={'sb-val ' + (chg >= 0 ? 'chg up' : 'chg down')}>
                        {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>

      {/* Macro groups */}
      {MACRO_GROUPS.map(g => {
        const items = g.symbols.map(s => macro.find(m => m.symbol === s)).filter(Boolean) as MacroItem[];
        return (
          <Card key={g.key} title={g.label} action={g.subtitle}>
            <div className="macro-group">
              {items.map(m => {
                const chg = m.change_pct_1d ?? 0;
                const cls = chg > 0.1 ? 'up' : chg < -0.1 ? 'down' : 'flat';
                return (
                  <div key={m.symbol} className="macro-item">
                    <div>
                      <div className="mi-sym">{displaySym(m.symbol)}</div>
                      <div className="mi-name">{m.name}</div>
                    </div>
                    <div className="mi-price">
                      {m.price != null ? m.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </div>
                    <div className={'chg-cell ' + cls}>
                      {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* 이 화면 데이터 설명 */}
      <div style={{ gridColumn: 'span 3' }}>
        <GlossaryPanel items={MACRO_GLOSSARY} />
      </div>
    </div>
  );
}
