import React, { useState, useMemo } from 'react';
import { 
  Search, 
  AlertCircle, 
  Check, 
  X, 
  Info,
  Filter,
  ShieldCheck,
  Heart,
  Baby
} from 'lucide-react';

// --- Mock Data ---
const KDRIs = {
  calcium: { name: '칼슘', limit: 2500, unit: 'mg' },
  zinc: { name: '아연', limit: 6, unit: 'mg' },
  vitD: { name: '비타민D', limit: 30, unit: 'μg' },
  probiotics: { name: '프로바이오틱스 수', limit: null, unit: 'CFU' }, // 상한 없음
  vitC: { name: '비타민C', limit: 400, unit: 'mg' },
};

const PRODUCTS = [
  {
    id: 'p1',
    name: '뼈건강엔 우리아이 쑥쑥 키즈 멀티비타민',
    maker: '(주)코지맘바이오',
    dosage: '하루 1회 × 2정',
    nutrients: { calcium: 210, zinc: 8.5, vitD: 10 },
    color: 'bg-orange-400'
  },
  {
    id: 'p2',
    name: '칼슘비타민D 키즈 곰 젤리',
    maker: '(주)서흥 오송2공장',
    dosage: '하루 1회 × 8g',
    nutrients: { calcium: 350, vitD: 25 },
    color: 'bg-rose-400'
  },
  {
    id: 'p3',
    name: '여에스더 유산균 & 덴탈',
    maker: '(주)메디오젠 충주공장',
    dosage: '하루 2회 × 1정',
    nutrients: { probiotics: 10000000000, calcium: 210 },
    color: 'bg-teal-400'
  },
  {
    id: 'p4',
    name: '키즈텐플러스+',
    maker: '코스맥스바이오(주)',
    dosage: '하루 1회 × 20포',
    nutrients: { vitD: 5, calcium: 250, zinc: 2.55 },
    color: 'bg-emerald-400'
  },
  {
    id: 'p5',
    name: '칼슘마그네슘D 츄어블',
    maker: '이앤에스(주)',
    dosage: '하루 2회 × 1정',
    nutrients: { calcium: 210, vitD: 5 },
    color: 'bg-amber-400'
  },
  {
    id: 'p6',
    name: '큐옴 키즈 유산균',
    maker: '(주)비오팜',
    dosage: '하루 1회 × 1포',
    nutrients: { probiotics: 10000000000, vitD: 5, zinc: 8.5 },
    color: 'bg-sky-400'
  }
];

const NUTRIENT_TABS = ['전체', '칼슘', '아연', '비타민D', '비타민C', '프로바이오틱스'];

export default function App() {
  const [age, setAge] = useState(15);
  const [activeTab, setActiveTab] = useState('전체');
  const [selectedIds, setSelectedIds] = useState(['p1', 'p2', 'p3', 'p4', 'p5']);

  // Handlers
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Derived State
  const selectedProducts = PRODUCTS.filter(p => selectedIds.includes(p.id));
  
  // Calculate Totals and Exceedances
  const nutrientTotals = useMemo(() => {
    const totals = {};
    Object.keys(KDRIs).forEach(key => totals[key] = { total: 0, contributors: [] });
    
    selectedProducts.forEach(product => {
      Object.entries(product.nutrients).forEach(([key, value]) => {
        if (totals[key]) {
          totals[key].total += value;
          totals[key].contributors.push({ id: product.id, name: product.name, value, color: product.color });
        }
      });
    });
    return totals;
  }, [selectedProducts]);

  const overLimitCount = Object.entries(nutrientTotals).filter(([key, data]) => {
    const limit = KDRIs[key].limit;
    return limit && data.total > limit;
  }).length;

  return (
    // 배경색을 차가운 계열에서 따뜻하고 부드러운 아이보리 톤으로 변경
    <div className="min-h-screen bg-[#FFFBF7] font-sans flex flex-col text-stone-800">
      
      {/* Top Navigation - 경계선을 없애고 부드러운 그림자 사용 */}
      <header className="bg-white/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-orange-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-2xl text-orange-500">
            <Heart size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight leading-none">VitaKids</h1>
            <span className="text-xs text-stone-500 font-medium mt-1 inline-block">우리아이 안심 영양 설계</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-100/50">
            DB: 1,000+ 개품
          </span>
          <div className="w-10 h-10 rounded-full bg-stone-100 border-2 border-white shadow-sm flex items-center justify-center text-stone-600 font-bold">
            <Baby size={20} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-8 flex gap-8">
        
        {/* Left Column: Controls & Grid */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          
          {/* Control Panel - 곡률을 3xl로 높여 극도로 부드러운 인상 부여 */}
          <section className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-50/50">
            
            {/* Age Slider Row */}
            <div className="flex items-center gap-6 mb-8 bg-[#FFFBF7] p-5 rounded-3xl border border-stone-100/50">
              <div className="w-28 font-extrabold text-stone-700 flex items-center gap-2">
                아이 월령 <Info size={16} className="text-stone-400" />
              </div>
              <div className="flex-1 flex items-center gap-4">
                <span className="text-sm font-bold text-stone-400">0</span>
                <input 
                  type="range" 
                  min="0" max="36" 
                  value={age} 
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="flex-1 h-3 bg-stone-200 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
                <span className="text-sm font-bold text-stone-400">36</span>
              </div>
              <div className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-extrabold text-lg min-w-[90px] text-center shadow-md shadow-orange-200">
                {age}개월
              </div>
              <div className="bg-rose-50 text-rose-600 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2">
                <ShieldCheck size={18} /> 
                <span>12~35개월 맞춤 가이드라인 적용</span>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-5">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-orange-500 transition-colors" size={22} />
                <input 
                  type="text" 
                  placeholder="제품명 또는 제조사로 검색해보세요 (예: 종근당, 칼슘)" 
                  className="w-full pl-14 pr-6 py-4 bg-stone-50/50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-stone-700 font-medium text-lg placeholder:text-stone-400"
                />
              </div>
              
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide mt-2">
                <div className="flex items-center gap-2 text-sm font-bold text-stone-500 mr-2 bg-stone-100 px-3 py-1.5 rounded-xl">
                  <Filter size={16} /> 영양소 필터
                </div>
                {NUTRIENT_TABS.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === tab 
                      ? 'bg-stone-800 text-white shadow-md' 
                      : 'bg-white border-2 border-stone-100 text-stone-500 hover:border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Product Grid - 날카로운 선 대신 두꺼운 둥근 테두리와 파스텔톤 활용 */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto pb-10">
            {PRODUCTS.map(product => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <div 
                  key={product.id}
                  onClick={() => toggleSelection(product.id)}
                  className={`bg-white p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col h-full relative group ${
                    isSelected 
                    ? 'border-orange-500 shadow-[0_8px_20px_rgb(249,115,22,0.15)] bg-orange-50/10' 
                    : 'border-stone-100 hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  {/* Selection Check */}
                  <div className={`absolute top-5 right-5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-200 text-transparent group-hover:border-orange-300'
                  }`}>
                    <Check size={16} strokeWidth={3.5} />
                  </div>

                  <div className="pr-10 mb-5">
                    <h3 className="font-extrabold text-stone-800 text-lg leading-snug mb-2 group-hover:text-orange-600 transition-colors">{product.name}</h3>
                    <p className="text-sm font-medium text-stone-400">{product.maker}</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="inline-block bg-[#FFFBF7] border border-orange-100 text-stone-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      {product.dosage}
                    </span>
                  </div>

                  {/* Nutrients Tags - 알약/젤리 같은 느낌을 주도록 둥글고 도톰하게 처리 */}
                  <div className="mt-auto flex flex-wrap gap-2.5">
                    {Object.entries(product.nutrients).map(([key, val]) => (
                      <span key={key} className={`text-xs px-3 py-1.5 rounded-xl font-bold border-2 ${
                        isSelected ? 'bg-white border-orange-200 text-orange-700' : 'bg-stone-50 border-transparent text-stone-500'
                      }`}>
                        {KDRIs[key].name} <span className="opacity-70 ml-0.5 font-medium">{val}{KDRIs[key].unit === 'CFU' ? ' CFU' : KDRIs[key].unit}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Right Column: Analysis Sidebar */}
        <aside className="w-[420px] flex-shrink-0 flex flex-col h-[calc(100vh-120px)] sticky top-[104px]">
          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-stone-100 flex flex-col h-full overflow-hidden">
            
            {/* Sidebar Header */}
            <div className="p-7 pb-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-xl text-stone-800 flex items-center gap-2">
                  안전 섭취 시뮬레이션
                </h2>
                <p className="text-xs text-stone-400 font-medium mt-1">현재 장바구니 조합의 영양 상태입니다</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="bg-stone-100 text-stone-600 text-xs font-bold px-3 py-1.5 rounded-xl">
                  {selectedIds.length}개 조합 중
                </span>
              </div>
            </div>

            {/* Over Limit Warning Banner (부드러운 경고) */}
            {overLimitCount > 0 && (
              <div className="mx-6 mt-4 mb-2 bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-rose-700 text-sm">주의가 필요한 영양소가 {overLimitCount}개 있어요</h4>
                  <p className="text-xs text-rose-600/80 font-medium mt-1 leading-relaxed">상한선을 초과한 성분은 흡수를 방해하거나 부작용이 있을 수 있으니 조합을 조절해주세요.</p>
                </div>
              </div>
            )}

            {/* Selected Items List */}
            <div className="max-h-[25%] overflow-y-auto border-b border-stone-100 p-4 px-6 bg-stone-50/50">
              {selectedProducts.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center opacity-50">
                  <div className="w-16 h-16 bg-stone-200 rounded-full mb-3 flex items-center justify-center">
                    <Search className="text-stone-400" size={24} />
                  </div>
                  <p className="text-stone-500 text-sm font-bold">비교할 제품을 담아보세요</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {selectedProducts.map(p => (
                    <div key={p.id} className="bg-white border border-stone-100 p-3.5 rounded-2xl flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 shadow-inner ${p.color}`}></div>
                        <span className="text-sm font-bold text-stone-700 truncate">{p.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSelection(p.id); }}
                        className="text-stone-300 hover:bg-rose-50 hover:text-rose-500 p-1.5 rounded-full transition-colors ml-2"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analysis Charts - 차트 모서리를 완전히 둥글게 하고, 경고 색상을 형광 레드가 아닌 부드러운 코랄/로즈톤으로 변경 */}
            <div className="flex-1 overflow-y-auto p-7 scrollbar-hide bg-white">
              <h3 className="text-sm font-bold text-stone-400 mb-6 flex items-center gap-2">
                성분별 적정량 분석 <span className="font-medium text-[11px] bg-stone-100 px-2 py-0.5 rounded-md">15개월 기준</span>
              </h3>

              <div className="flex flex-col gap-8">
                {Object.entries(nutrientTotals).map(([key, data]) => {
                  if (data.total === 0) return null;
                  
                  const kdri = KDRIs[key];
                  const hasLimit = kdri.limit !== null;
                  const percentage = hasLimit ? (data.total / kdri.limit) * 100 : 0;
                  const isOver = hasLimit && percentage > 100;

                  return (
                    <div key={key} className="flex flex-col gap-3">
                      <div className="flex items-end justify-between">
                        <span className={`font-extrabold text-[15px] ${isOver ? 'text-rose-600' : 'text-stone-700'}`}>
                          {kdri.name}
                        </span>
                        <div className="text-xs font-bold text-stone-400">
                          <span className={`text-[13px] ${isOver ? 'text-rose-600 font-extrabold' : 'text-stone-800'}`}>
                            {data.total.toLocaleString()}<span className="text-[10px] ml-0.5">{kdri.unit}</span>
                          </span>
                          {hasLimit && <span className="opacity-60"> / 상한 {kdri.limit.toLocaleString()}{kdri.unit}</span>}
                        </div>
                      </div>

                      {hasLimit ? (
                        <>
                          {/* Progress Bar Container - 두껍고 둥글게 */}
                          <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex shadow-inner">
                            {isOver ? (
                              // Over limit: Soft red/rose with subtle stripes
                              <div className="h-full bg-rose-400 w-full relative">
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 20px)' }}></div>
                              </div>
                            ) : (
                              // Under limit: Show stacked contributors
                              data.contributors.map((c, i) => {
                                const width = (c.value / kdri.limit) * 100;
                                return (
                                  <div 
                                    key={i} 
                                    style={{ width: `${width}%` }} 
                                    className={`h-full ${c.color} border-r-2 border-white/50 last:border-0 transition-all duration-500`}
                                    title={`${c.name}: ${c.value}${kdri.unit}`}
                                  />
                                );
                              })
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <span className="text-[10px] font-bold text-stone-300">0%</span>
                            <span className={`text-xs font-extrabold ${isOver ? 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg' : 'text-stone-400'}`}>
                              {percentage.toFixed(0)}% {isOver && '초과'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="bg-[#FFFBF7] text-stone-500 text-xs py-3 px-4 rounded-2xl border border-orange-100/50 font-medium flex items-center gap-2">
                          <ShieldCheck size={14} className="text-orange-300" />
                          충분히 먹여도 안전한 성분이에요.
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.values(nutrientTotals).every(d => d.total === 0) && (
                  <div className="text-center py-12 text-stone-300 text-sm font-bold">
                    분석 결과가 여기에 표시됩니다
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </aside>
      </main>
      
      {/* Scrollbar CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}