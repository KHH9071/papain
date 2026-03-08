import React, { useState, useMemo } from 'react';
import { 
  Search, 
  AlertCircle, 
  Check, 
  X, 
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Baby,
  Filter
} from 'lucide-react';

// --- Mock Data ---
const KDRIs = {
  calcium: { name: '칼슘', limit: 2500, unit: 'mg' },
  iron: { name: '철분', limit: 40, unit: 'mg' }, // 추가됨
  zinc: { name: '아연', limit: 6, unit: 'mg' },
  vitD: { name: '비타민D', limit: 30, unit: 'μg' },
  vitC: { name: '비타민C', limit: 400, unit: 'mg' },
};

const PRODUCTS = [
  {
    id: 'p1',
    name: '우리아이 쑥쑥 키즈 멀티비타민',
    maker: '(주)코지맘바이오',
    dosage: '1일 1회 2정',
    nutrients: { calcium: 210, zinc: 8.5, vitD: 10 },
    color: 'bg-orange-400',
    desc: '성장기 필수 영양소를 한 번에 섭취할 수 있는 종합 비타민입니다.'
  },
  {
    id: 'p2',
    name: '칼슘비타민D 키즈 곰 젤리',
    maker: '(주)서흥',
    dosage: '1일 1회 8g',
    nutrients: { calcium: 350, vitD: 25 },
    color: 'bg-rose-400',
    desc: '아이들이 좋아하는 곰돌이 모양의 딸기맛 젤리입니다.'
  },
  {
    id: 'p3',
    name: '튼튼 철분 & 비타민C 츄어블',
    maker: '종근당건강',
    dosage: '1일 2회 1정',
    nutrients: { iron: 15, vitC: 50 },
    color: 'bg-teal-400',
    desc: '흡수율을 높이기 위해 비타민C를 함께 배합한 철분제입니다.'
  },
  {
    id: 'p4',
    name: '키즈텐플러스+',
    maker: '코스맥스바이오(주)',
    dosage: '1일 1회 1포',
    nutrients: { vitD: 5, calcium: 250, zinc: 2.55 },
    color: 'bg-emerald-400',
    desc: '액상 형태로 물 없이 간편하게 섭취 가능합니다.'
  },
  {
    id: 'p5',
    name: '고함량 액상 철분 베이비 드롭',
    maker: '이앤에스(주)',
    dosage: '1일 1회 1스포이드',
    nutrients: { iron: 30 },
    color: 'bg-amber-400',
    desc: '이유식에 섞어 먹이기 좋은 고농축 액상 철분입니다.'
  }
];

const NUTRIENT_TABS = [
  { id: 'all', label: '전체보기' },
  { id: 'calcium', label: '칼슘' },
  { id: 'iron', label: '철분' },
  { id: 'zinc', label: '아연' },
  { id: 'vitD', label: '비타민D' }
];

export default function App() {
  const [age, setAge] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNutrient, setActiveNutrient] = useState('all');
  const [selectedIds, setSelectedIds] = useState(['p1', 'p2']);
  const [expandedId, setExpandedId] = useState(null);

  // Handlers
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  // Derived State: Filtered Products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchQuery = p.name.includes(searchQuery) || p.maker.includes(searchQuery);
      const matchNutrient = activeNutrient === 'all' || p.nutrients.hasOwnProperty(activeNutrient);
      return matchQuery && matchNutrient;
    });
  }, [searchQuery, activeNutrient]);

  const selectedProducts = PRODUCTS.filter(p => selectedIds.includes(p.id));
  
  // Chart Data Calculation
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
    <div className="flex justify-center bg-gray-100 h-screen font-sans">
      {/* Mobile Wrapper */}
      <div className="w-full max-w-md bg-[#FFFBF7] h-full flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* =========================================
            TOP: STICKY DASHBOARD
            ========================================= */}
        <section className="flex-shrink-0 bg-white shadow-[0_8px_20px_rgb(0,0,0,0.04)] z-20 rounded-b-3xl border-b border-orange-50 relative">
          
          {/* Header & Age Selector */}
          <div className="px-5 pt-6 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                <Baby size={18} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-stone-800 leading-tight">우리아이 영양설계</h1>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">12~35개월 기준</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-[#FFFBF7] border border-stone-200 rounded-xl px-2 py-1">
              <button onClick={() => setAge(Math.max(0, age - 1))} className="w-6 h-6 flex items-center justify-center text-stone-400 font-bold">-</button>
              <span className="text-sm font-extrabold text-orange-600 w-10 text-center">{age}개월</span>
              <button onClick={() => setAge(age + 1)} className="w-6 h-6 flex items-center justify-center text-stone-400 font-bold">+</button>
            </div>
          </div>

          {/* Selected Products (Horizontal Scroll Legend) */}
          <div className="px-5 pb-3">
            {selectedProducts.length === 0 ? (
              <div className="text-[11px] text-stone-400 font-bold bg-stone-50 py-2 px-3 rounded-lg text-center border border-dashed border-stone-200">
                아래에서 제품을 담아 시뮬레이션 해보세요
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x">
                {selectedProducts.map(p => (
                  <div key={p.id} className="snap-start shrink-0 flex items-center gap-1.5 bg-stone-50 border border-stone-100 pl-2 pr-1 py-1 rounded-full">
                    <div className={`w-2 h-2 rounded-full ${p.color}`}></div>
                    <span className="text-[10px] font-bold text-stone-600 truncate max-w-[80px]">{p.name}</span>
                    <button onClick={() => toggleSelection(p.id)} className="bg-stone-200/50 hover:bg-stone-200 p-0.5 rounded-full text-stone-500">
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Stacked Bar Charts */}
          <div className="px-5 pb-5 max-h-[160px] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-stone-400 flex items-center gap-1">
                <ShieldCheck size={14} /> 영양소 누적 합산량
              </h2>
              {overLimitCount > 0 && (
                <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertCircle size={10} /> {overLimitCount}개 상한초과
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {Object.entries(nutrientTotals).map(([key, data]) => {
                // 선택된 제품에 해당 영양소가 없으면 렌더링 생략 (공간 절약)
                if (data.total === 0) return null;
                
                const kdri = KDRIs[key];
                const limit = kdri.limit;
                const total = data.total;
                
                // 수학적 트릭: 시각적 컨테이너의 100%를 limit과 total 중 큰 값으로 설정
                // 상한선을 넘으면 바가 상한선 마커를 '뚫고' 나가는 것처럼 시각화
                const scaleMax = Math.max(limit, total);
                const limitPercentage = (limit / scaleMax) * 100;
                const isOver = total > limit;

                return (
                  <div key={key} className="flex flex-col gap-1 relative">
                    <div className="flex justify-between items-end">
                      <span className={`text-[11px] font-extrabold ${isOver ? 'text-rose-600' : 'text-stone-700'}`}>
                        {kdri.name}
                      </span>
                      <span className={`text-[10px] font-bold ${isOver ? 'text-rose-600' : 'text-stone-500'}`}>
                        {total}{kdri.unit} <span className="text-stone-300 font-medium">/ 상한 {limit}</span>
                      </span>
                    </div>

                    {/* Chart Container */}
                    <div className="relative w-full h-2.5 bg-stone-100 rounded-full flex">
                      
                      {/* Normal Contributors */}
                      <div className="flex h-full w-full rounded-full overflow-hidden relative">
                        {data.contributors.map((c, i) => {
                          const width = (c.value / scaleMax) * 100;
                          return (
                            <div 
                              key={i} 
                              style={{ width: `${width}%` }} 
                              className={`h-full ${c.color} border-r border-white/30 last:border-0`}
                            />
                          );
                        })}
                        
                        {/* Red Excess Overlay: 상한선을 초과한 영역을 덮는 빨간색 패턴 */}
                        {isOver && (
                          <div 
                            style={{ 
                              left: `${limitPercentage}%`, 
                              width: `${100 - limitPercentage}%` 
                            }} 
                            className="absolute top-0 bottom-0 bg-rose-500 z-10 opacity-90"
                          >
                            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)' }}></div>
                          </div>
                        )}
                      </div>

                      {/* Limit Marker (상한선 기준선) */}
                      <div 
                        style={{ left: `${limitPercentage}%` }}
                        className={`absolute top-[-4px] bottom-[-4px] w-0.5 z-20 ${isOver ? 'bg-rose-600' : 'bg-stone-300'}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        {/* =========================================
            BOTTOM: SCROLLABLE EXPLORE AREA
            ========================================= */}
        <section className="flex-1 overflow-y-auto bg-[#FFFBF7]">
          
          {/* Sticky Controls within Scroll */}
          <div className="sticky top-0 bg-[#FFFBF7]/95 backdrop-blur-sm z-10 px-5 py-4 border-b border-stone-100/50">
            {/* Search */}
            <div className="relative group mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-orange-500" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="어떤 영양제를 찾으시나요?" 
                className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:border-orange-400 shadow-sm text-sm font-medium text-stone-700 placeholder:text-stone-400"
              />
            </div>

            {/* Curation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {NUTRIENT_TABS.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveNutrient(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                    activeNutrient === tab.id 
                    ? 'bg-stone-800 text-white' 
                    : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product List */}
          <div className="px-5 pb-10 pt-2 flex flex-col gap-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-sm font-bold">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredProducts.map(product => {
                const isSelected = selectedIds.includes(product.id);
                const isExpanded = expandedId === product.id;

                return (
                  <div 
                    key={product.id}
                    onClick={() => toggleSelection(product.id)}
                    className={`bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col relative overflow-hidden ${
                      isSelected ? 'border-orange-500 shadow-md shadow-orange-500/10' : 'border-stone-100'
                    }`}
                  >
                    {/* Basic Info Row */}
                    <div className="p-4 flex gap-3 items-start relative">
                      {/* Checkbox */}
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-300 text-transparent'
                      }`}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                      
                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-8">
                        <p className="text-[10px] font-bold text-stone-400 mb-0.5">{product.maker}</p>
                        <h3 className="font-extrabold text-stone-800 text-[15px] leading-tight truncate">{product.name}</h3>
                        
                        {/* Tags Preview */}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {Object.keys(product.nutrients).map(key => (
                            <span key={key} className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected ? 'bg-orange-50 text-orange-600' : 'bg-stone-50 text-stone-500 border border-stone-100'
                            }`}>
                              {KDRIs[key].name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Accordion Toggle */}
                      <button 
                        onClick={(e) => toggleExpand(product.id, e)}
                        className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-stone-50 text-stone-400"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {/* Accordion Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-stone-50/50 border-t border-stone-100 mt-1" onClick={e => e.stopPropagation()}>
                        <p className="text-xs text-stone-500 font-medium leading-relaxed mb-3">
                          {product.desc}
                        </p>
                        <div className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                            <span className="text-[11px] font-bold text-stone-400">섭취방법</span>
                            <span className="text-xs font-extrabold text-stone-700">{product.dosage}</span>
                          </div>
                          {Object.entries(product.nutrients).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-stone-500">{KDRIs[key].name}</span>
                              <span className="text-xs font-bold text-stone-800">{val}{KDRIs[key].unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>
      
      {/* Scrollbar CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}