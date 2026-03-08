import React, { useState } from 'react';
import { 
  AlertCircle, 
  ChevronLeft,
  ChevronRight,
  Utensils,
  Pill,
  CheckCircle2,
  Activity,
  TrendingUp,
  CalendarDays,
  Info
} from 'lucide-react';

// --- Mock Data & Constants ---
const WEEK_DAYS = [
  { id: 'mon', label: '월', date: 12 },
  { id: 'tue', label: '화', date: 13 },
  { id: 'wed', label: '수', date: 14 },
  { id: 'thu', label: '목', date: 15, hasData: true },
  { id: 'fri', label: '금', date: 16, hasData: true },
  { id: 'sat', label: '오늘', date: 17, hasData: true, isToday: true },
  { id: 'sun', label: '일', date: 18 },
];

const STANDARDS = {
  calcium: { name: '칼슘', ri: 500, ul: 2500, unit: 'mg' },
  iron: { name: '철분', ri: 6, ul: 40, unit: 'mg' },
  zinc: { name: '아연', ri: 3, ul: 6, unit: 'mg' },
  vitD: { name: '비타민D', ri: 5, ul: 30, unit: 'μg' },
  vitC: { name: '비타민C', ri: 40, ul: 400, unit: 'mg' },
};

const DAILY_RECORDS = {
  'thu': { calcium: 100, iron: 2, zinc: 2, vitD: 2, vitC: 10 },
  'fri': { calcium: 210, iron: 22, zinc: 12.5, vitD: 5, vitC: 0 },
  'sat': { calcium: 0, iron: 22, zinc: 12.5, vitD: 0, vitC: 0 }
};

const FOOD_SUGGESTIONS = {
  calcium: [
    { name: '우유', amount: '1컵', icon: '🥛', value: 200 },
    { name: '치즈', amount: '2장', icon: '🧀', value: 300 }
  ],
  vitD: [
    { name: '연어', amount: '30g', icon: '🍣', value: 3 },
    { name: '계란', amount: '1개', icon: '🥚', value: 2 }
  ],
  vitC: [
    { name: '딸기', amount: '6개', icon: '🍓', value: 40 },
  ],
  iron: [
    { name: '소고기', amount: '50g', icon: '🥩', value: 2 },
  ],
  zinc: [
    { name: '닭고기', amount: '50g', icon: '🍗', value: 1.5 }
  ]
};

// --- Time-Series Mock Data (Trend) ---
// age: 개월수, intake: 섭취량, ri: 권장량, ul: 상한선
const TREND_DATA = {
  calcium: [
    { age: 12, intake: 250, ri: 500, ul: 2500 },
    { age: 18, intake: 300, ri: 500, ul: 2500 },
    { age: 24, intake: 480, ri: 500, ul: 2500 },
    { age: 26, intake: 480, ri: 500, ul: 2500, isCurrent: true }, // 현재
    { age: 30, intake: 480, ri: 600, ul: 2500, isFuture: true }, // 미래: 권장량 상승, 섭취량 유지 가정
    { age: 36, intake: 480, ri: 600, ul: 2500, isFuture: true },
  ],
  iron: [
    { age: 12, intake: 4, ri: 6, ul: 40 },
    { age: 18, intake: 5, ri: 6, ul: 40 },
    { age: 24, intake: 8, ri: 6, ul: 40 },
    { age: 26, intake: 8, ri: 6, ul: 40, isCurrent: true },
    { age: 30, intake: 8, ri: 8, ul: 40, isFuture: true },
    { age: 36, intake: 8, ri: 8, ul: 40, isFuture: true },
  ],
  vitD: [
    { age: 12, intake: 5, ri: 5, ul: 30 },
    { age: 18, intake: 5, ri: 5, ul: 30 },
    { age: 24, intake: 5, ri: 5, ul: 30 },
    { age: 26, intake: 5, ri: 5, ul: 30, isCurrent: true },
    { age: 30, intake: 5, ri: 10, ul: 30, isFuture: true }, // 미래에 확 높아지는 케이스
    { age: 36, intake: 5, ri: 10, ul: 30, isFuture: true },
  ]
};

// --- Components ---

// SVG Sparkline Chart Component
const TrendChart = ({ data, standard }) => {
  const width = 320;
  const height = 120;
  const paddingX = 20;
  const paddingY = 20;

  // 스케일 계산 로직: 상한선(UL)을 차트의 Max로 잡으면 변화가 안보이므로, 
  // (최대 권장량 * 1.5) 정도를 로컬 Max로 잡고, UL은 상단 경고선으로만 표기
  const maxRI = Math.max(...data.map(d => d.ri));
  const maxIntake = Math.max(...data.map(d => d.intake));
  const chartMaxY = Math.max(maxRI, maxIntake) * 1.4; 

  const getX = (index) => paddingX + (index * ((width - paddingX * 2) / (data.length - 1)));
  const getY = (value) => height - paddingY - ((value / chartMaxY) * (height - paddingY * 2));

  // Path 생성
  const intakePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.intake)}`).join(' ');
  const riPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.ri)}`).join(' ');

  const currentIndex = data.findIndex(d => d.isCurrent);
  const currentX = getX(currentIndex);

  return (
    <div className="relative w-full overflow-x-auto scrollbar-hide bg-white rounded-2xl border border-stone-100 p-4 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-extrabold text-stone-800 text-base">{standard.name} <span className="text-stone-400 text-xs font-medium ml-1">추세 및 예측</span></h3>
        <span className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-1 rounded-md">단위: {standard.unit}</span>
      </div>

      <div className="min-w-[320px] relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Background Zones */}
          <rect x={paddingX} y={0} width={width - paddingX*2} height={getY(chartMaxY * 0.8)} fill="#fff1f2" opacity="0.5" />
          <rect x={paddingX} y={getY(chartMaxY * 0.8)} width={width - paddingX*2} height={height - paddingY - getY(chartMaxY * 0.8)} fill="#f6fcf9" opacity="0.5" />
          
          {/* Current Time Divider */}
          <line x1={currentX} y1={0} x2={currentX} y2={height - paddingY} stroke="#e7e5e4" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* RI (권장량) Line - Dashed Green */}
          <path d={riPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
          
          {/* Intake (섭취량) Line - Solid Orange */}
          <path d={intakePath} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Area under Intake (Past & Current) */}
          <path 
            d={`${intakePath.split(`L ${getX(currentIndex + 1)}`)[0]} L ${currentX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`} 
            fill="url(#orangeGradient)" 
            opacity="0.2" 
          />
          <defs>
            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data Points */}
          {data.map((d, i) => (
            <g key={i}>
              {/* Intake Dots */}
              <circle cx={getX(i)} cy={getY(d.intake)} r="4" fill={d.isFuture ? "#fed7aa" : "#f97316"} stroke="#fff" strokeWidth="2" />
              {/* X-Axis Labels */}
              <text x={getX(i)} y={height} textAnchor="middle" fontSize="10" fill={d.isCurrent ? "#f97316" : "#a8a29e"} fontWeight={d.isCurrent ? "bold" : "normal"}>
                {d.age}개월
              </text>
              {/* Future Gap Highlight */}
              {d.isFuture && d.intake < d.ri && (
                <line x1={getX(i)} y1={getY(d.intake) - 6} x2={getX(i)} y2={getY(d.ri) + 6} stroke="#ef4444" strokeWidth="2" strokeDasharray="2 2" />
              )}
            </g>
          ))}
          
          {/* Floating Labels for Legend inside chart */}
          <text x={width - paddingX} y={getY(data[data.length-1].ri) - 8} textAnchor="end" fontSize="10" fill="#10b981" fontWeight="bold">권장량</text>
          <text x={width - paddingX} y={getY(data[data.length-1].intake) + 14} textAnchor="end" fontSize="10" fill="#f97316" fontWeight="bold">유지시 예상</text>
        </svg>

        {/* Future Gap Warning Alert */}
        {data[data.length-1].intake < data[data.length-1].ri && (
          <div className="mt-2 bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl flex items-start gap-2">
            <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-stone-600 leading-tight">
              현재 패턴 유지 시 <strong className="text-orange-600">{data[data.length-1].age}개월</strong>부터 성장에 필요한 {standard.name} 권장량 대비 부족해집니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


export default function App() {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'trend'
  const [selectedDay, setSelectedDay] = useState('sat');

  const currentData = DAILY_RECORDS[selectedDay] || { calcium: 0, iron: 0, zinc: 0, vitD: 0, vitC: 0 };
  const overLimitNutrients = Object.entries(currentData).filter(([key, value]) => value > STANDARDS[key].ul);

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen font-sans">
      <div className="w-full max-w-md bg-[#FFFBF7] h-[100dvh] flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* =========================================
            TOP: HEADER & TAB CONTROL
            ========================================= */}
        <section className="bg-white px-5 pt-8 pb-4 shadow-[0_8px_20px_rgb(0,0,0,0.03)] z-30 relative border-b border-stone-100">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-extrabold text-stone-800 flex items-center gap-2">
              <Activity className="text-orange-500" />
              영양 리포트
            </h1>
            <div className="bg-stone-100 px-3 py-1.5 rounded-full text-sm font-bold text-stone-600 flex items-center gap-1.5">
              지후 <span className="text-stone-300">|</span> 26개월
            </div>
          </div>

          {/* Segmented Control */}
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('daily')}
              className={`flex-1 py-2 text-sm font-extrabold rounded-lg transition-all flex justify-center items-center gap-1.5 ${
                viewMode === 'daily' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'
              }`}
            >
              <CalendarDays size={16} /> 일간 채움
            </button>
            <button 
              onClick={() => setViewMode('trend')}
              className={`flex-1 py-2 text-sm font-extrabold rounded-lg transition-all flex justify-center items-center gap-1.5 ${
                viewMode === 'trend' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'
              }`}
            >
              <TrendingUp size={16} /> 성장 추이
            </button>
          </div>
        </section>

        {/* =========================================
            SCROLLABLE CONTENT AREA
            ========================================= */}
        <section className="flex-1 overflow-y-auto scrollbar-hide bg-[#FFFBF7]">
          
          {viewMode === 'daily' ? (
            /* --- 1. DAILY VIEW (기존 기능) --- */
            <div className="px-5 pt-4 pb-24">
              
              {/* Weekly Calendar */}
              <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-stone-100 mb-6">
                <div className="flex justify-between items-center mb-4 px-1">
                  <button className="p-1 text-stone-400 hover:text-stone-800"><ChevronLeft size={20}/></button>
                  <span className="text-sm font-extrabold text-stone-800">10월 3주차</span>
                  <button className="p-1 text-stone-400 hover:text-stone-800"><ChevronRight size={20}/></button>
                </div>
                <div className="flex justify-between items-end gap-1">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = selectedDay === day.id;
                    return (
                      <button 
                        key={day.id} onClick={() => setSelectedDay(day.id)}
                        className={`flex flex-col items-center p-2 rounded-2xl w-[14%] transition-all ${
                          isSelected ? 'bg-orange-500 text-white shadow-md scale-105' : 'bg-transparent text-stone-500'
                        }`}
                      >
                        <span className={`text-[10px] font-bold mb-1 ${isSelected ? 'text-orange-100' : 'text-stone-400'}`}>{day.label}</span>
                        <span className={`text-sm font-extrabold ${isSelected ? 'text-white' : 'text-stone-800'}`}>{day.date}</span>
                        <div className={`w-1 h-1 rounded-full mt-1.5 ${isSelected ? 'bg-white' : day.hasData ? 'bg-orange-400' : 'bg-transparent'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Danger Banner */}
              {overLimitNutrients.length > 0 && (
                <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h3 className="text-rose-700 font-extrabold text-sm mb-1">상한 섭취량(UL) 초과 경고!</h3>
                    {overLimitNutrients.map(([key, val]) => (
                      <p key={key} className="text-xs text-rose-600 font-medium leading-relaxed">
                        <span className="font-bold">{STANDARDS[key].name}</span> 섭취량이 상한선({STANDARDS[key].ul}{STANDARDS[key].unit})을 초과한 <span className="font-bold">{val}{STANDARDS[key].unit}</span>입니다. 즉시 조절해주세요.
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary Bridge Visualization */}
              <div className="flex flex-col gap-8">
                {Object.entries(STANDARDS).map(([key, std]) => {
                  const intake = currentData[key];
                  const isOverUL = intake > std.ul;
                  const isMetRI = intake >= std.ri && !isOverUL;
                  const shortfall = Math.max(0, std.ri - intake);
                  const percentageToRI = Math.min(100, (intake / std.ri) * 100);

                  return (
                    <div key={key} className="flex flex-col relative">
                      <div className="flex justify-between items-end mb-2.5 px-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-800 text-base">{std.name}</span>
                          {isOverUL && <span className="bg-rose-100 text-rose-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md">위험</span>}
                          {isMetRI && <span className="bg-emerald-100 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5"><CheckCircle2 size={10}/> 충족</span>}
                        </div>
                        <div className="text-xs font-bold">
                          <span className={isOverUL ? 'text-rose-600 text-sm' : 'text-stone-800 text-sm'}>{intake}</span>
                          <span className="text-stone-400 text-[10px] ml-0.5">/ 권장 {std.ri}{std.unit}</span>
                        </div>
                      </div>

                      <div className="w-full h-12 relative flex items-center">
                        <div className="absolute inset-0 bg-stone-100 rounded-xl overflow-hidden" />
                        {isOverUL ? (
                          <div className="absolute inset-0 bg-rose-500 rounded-xl flex items-center px-4">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}></div>
                            <span className="relative z-10 text-white text-xs font-extrabold tracking-wider shadow-sm">상한선 초과 (UL {std.ul}{std.unit})</span>
                          </div>
                        ) : (
                          <>
                            <div 
                              className={`absolute left-0 top-0 bottom-0 rounded-xl transition-all duration-700 ease-out flex items-center justify-end px-2 ${percentageToRI > 0 ? (isMetRI ? 'bg-emerald-500' : 'bg-orange-400') : 'bg-transparent'}`}
                              style={{ width: `${Math.max(percentageToRI, 0)}%` }}
                            >
                              {percentageToRI > 15 && <span className="text-white/90 text-[10px] font-bold"><Pill size={12} className="inline mr-0.5"/>건기식</span>}
                            </div>
                            {!isMetRI && (
                              <div 
                                className="absolute right-0 top-0 bottom-0 rounded-r-xl border-2 border-dashed border-stone-300 bg-stone-50/50 flex items-center px-3 gap-2 overflow-hidden"
                                style={{ width: `${100 - percentageToRI}%` }}
                              >
                                <span className="text-[10px] font-bold text-stone-400 shrink-0 mr-1"><Utensils size={12} className="inline mr-1"/>식단으로 채워요:</span>
                                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                  {FOOD_SUGGESTIONS[key]?.map((food, idx) => (
                                    <div key={idx} className="flex items-center bg-white border border-stone-200 rounded-md px-1.5 py-1 shrink-0 shadow-sm">
                                      <span className="text-sm mr-1">{food.icon}</span>
                                      <span className="text-[10px] font-extrabold text-stone-700 whitespace-nowrap">{food.name} <span className="text-orange-600">{food.amount}</span></span>
                                    </div>
                                  ))}
                                  {(!FOOD_SUGGESTIONS[key] || FOOD_SUGGESTIONS[key].length === 0) && <span className="text-[10px] text-stone-400 font-medium">일반 식사로 섭취</span>}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {!isOverUL && shortfall > 0 && (
                        <p className="text-[11px] font-medium text-stone-500 mt-2 px-1 flex items-start gap-1">
                          <CheckCircle2 size={12} className="text-orange-400 shrink-0 mt-0.5" />
                          건기식으로 {shortfall}{std.unit}이 부족하지만, 위 음식들을 식단에 포함했다면 걱정하지 마세요.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* --- 2. TREND VIEW (신규 기능: 시계열 차트) --- */
            <div className="px-5 pt-6 pb-24">
              <div className="mb-6">
                <h2 className="text-lg font-extrabold text-stone-800 mb-1">성장에 따른 영양 예측</h2>
                <p className="text-sm font-medium text-stone-500">현재의 섭취 패턴을 유지할 경우, 앞으로 다가올 개월 수의 권장량 대비 부족해지는 성분을 확인하세요.</p>
              </div>

              <TrendChart data={TREND_DATA.calcium} standard={STANDARDS.calcium} />
              <TrendChart data={TREND_DATA.vitD} standard={STANDARDS.vitD} />
              <TrendChart data={TREND_DATA.iron} standard={STANDARDS.iron} />
            </div>
          )}

        </section>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-stone-100 px-6 py-4 flex justify-between items-center z-40 pb-8">
          {[
            { id: 'home', label: '홈' },
            { id: 'search', label: '탐색' },
            { id: 'record', label: '기록', active: true },
            { id: 'community', label: '라운지' },
            { id: 'my', label: '마이' },
          ].map((item) => (
            <button key={item.id} className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-md mb-0.5 ${item.active ? 'bg-orange-500' : 'bg-stone-300'}`} />
              <span className={`text-[10px] font-extrabold ${item.active ? 'text-orange-600' : 'text-stone-400'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}