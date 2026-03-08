import React, { useState, useMemo } from 'react';
import { 
  Search, 
  AlertTriangle, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Info,
  Filter
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
    color: 'bg-blue-500'
  },
  {
    id: 'p2',
    name: '칼슘비타민D 키즈 곰 젤리',
    maker: '(주)서흥 오송2공장',
    dosage: '하루 1회 × 8g',
    nutrients: { calcium: 350, vitD: 25 },
    color: 'bg-purple-500'
  },
  {
    id: 'p3',
    name: '여에스더 유산균 & 덴탈',
    maker: '(주)메디오젠 충주공장',
    dosage: '하루 2회 × 1정',
    nutrients: { probiotics: 10000000000, calcium: 210 },
    color: 'bg-teal-500'
  },
  {
    id: 'p4',
    name: '키즈텐플러스+',
    maker: '코스맥스바이오(주)',
    dosage: '하루 1회 × 20포',
    nutrients: { vitD: 5, calcium: 250, zinc: 2.55 },
    color: 'bg-green-500'
  },
  {
    id: 'p5',
    name: '칼슘마그네슘D 츄어블',
    maker: '이앤에스(주)',
    dosage: '하루 2회 × 1정',
    nutrients: { calcium: 210, vitD: 5 },
    color: 'bg-yellow-500'
  },
  {
    id: 'p6',
    name: '큐옴 키즈 유산균',
    maker: '(주)비오팜',
    dosage: '하루 1회 × 1포',
    nutrients: { probiotics: 10000000000, vitD: 5, zinc: 8.5 },
    color: 'bg-indigo-500'
  }
];

const NUTRIENT_TABS = ['전체', '칼슘', '아연', '비타민D', '비타민C', '프로바이오틱스'];

export default function App() {
  const [age, setAge] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('전체');
  const [selectedIds, setSelectedIds] = useState(['p1', 'p2', 'p3', 'p4', 'p5']);
  const [expandedItems, setExpandedItems] = useState(['p6']); // For showing detailed warning in sidebar

  // Handlers
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">VitaKids</h1>
          <span className="text-sm text-slate-500 font-medium">영유아 건기식 분석 대시보드</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm font-semibold">
            DB: 1,000+ 개품
          </span>
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
            N
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex gap-6">
        
        {/* Left Column: Controls & Grid */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Control Panel */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            {/* Age Slider Row */}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-32 font-bold text-slate-800 flex items-center gap-2">
                아이 월령 <Info size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 flex items-center gap-4">
                <span className="text-sm text-slate-400">0</span>
                <input 
                  type="range" 
                  min="0" max="36" 
                  value={age} 
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-sm text-slate-400">36</span>
              </div>
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-lg min-w-[80px] text-center shadow-md shadow-indigo-200">
                {age}개월
              </div>
              <div className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle size={16} /> 12~35개월 상한선 적용 중
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="제품명 또는 제조사로 검색..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mr-2">
                  <Filter size={16} /> 영양소 필터
                </div>
                {NUTRIENT_TABS.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                      activeTab === tab 
                      ? 'bg-slate-800 text-white shadow-md' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Product Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-10">
            {PRODUCTS.map(product => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <div 
                  key={product.id}
                  onClick={() => toggleSelection(product.id)}
                  className={`bg-white p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col h-full relative group ${
                    isSelected 
                    ? 'border-indigo-600 shadow-md shadow-indigo-100' 
                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  {/* Selection Check */}
                  <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent group-hover:border-indigo-400'
                  }`}>
                    <Check size={14} strokeWidth={3} />
                  </div>

                  <div className="pr-8 mb-4">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{product.name}</h3>
                    <p className="text-sm text-slate-500">{product.maker}</p>
                  </div>
                  
                  <div className="mb-4">
                    <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-semibold">
                      {product.dosage}
                    </span>
                  </div>

                  {/* Nutrients Tags */}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {Object.entries(product.nutrients).map(([key, val]) => (
                      <span key={key} className={`text-xs px-2.5 py-1 rounded-md font-bold border ${
                        isSelected ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {KDRIs[key].name} {val}{KDRIs[key].unit === 'CFU' ? ' CFU' : KDRIs[key].unit}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Right Column: Analysis Sidebar */}
        <aside className="w-[400px] flex-shrink-0 flex flex-col h-[calc(100vh-100px)] sticky top-[88px]">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden">
            
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-extrabold text-lg text-slate-900">내 아이 섭취 시뮬레이션</h2>
              <div className="flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-md">
                  {selectedIds.length}개 선택
                </span>
                {overLimitCount > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-red-200">
                    <AlertTriangle size={12} /> {overLimitCount}개 초과
                  </span>
                )}
              </div>
            </div>

            {/* Selected Items List (Compact) */}
            <div className="max-h-[30%] overflow-y-auto border-b border-slate-100 p-3 bg-slate-50">
              {selectedProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  좌측에서 제품을 클릭하여 추가하세요
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedProducts.map(p => (
                    <div key={p.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-start justify-between group">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.color}`}></div>
                        <span className="text-sm font-semibold text-slate-700 truncate">{p.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSelection(p.id); }}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analysis Charts */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
              <h3 className="text-sm font-bold text-slate-500 mb-6 flex items-center gap-2">
                영양소 기여도 시각화 <span className="font-normal text-xs">(KDRIs 상한선 기준)</span>
              </h3>

              <div className="flex flex-col gap-8">
                {Object.entries(nutrientTotals).map(([key, data]) => {
                  if (data.total === 0) return null;
                  
                  const kdri = KDRIs[key];
                  const hasLimit = kdri.limit !== null;
                  const percentage = hasLimit ? (data.total / kdri.limit) * 100 : 0;
                  const isOver = hasLimit && percentage > 100;

                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <div className="flex items-end justify-between">
                        <span className={`font-bold text-sm ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
                          {kdri.name}
                        </span>
                        <div className="text-xs font-semibold text-slate-500">
                          <span className={isOver ? 'text-red-600 font-bold' : 'text-slate-900'}>
                            {data.total.toLocaleString()}{kdri.unit}
                          </span>
                          {hasLimit && ` / 상한 ${kdri.limit.toLocaleString()}${kdri.unit}`}
                        </div>
                      </div>

                      {hasLimit ? (
                        <>
                          {/* Progress Bar Container */}
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            {isOver ? (
                              // Over limit: Show solid red bar
                              <div className="h-full bg-red-500 w-full relative">
                                {/* Diagonal stripes pattern for danger */}
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}></div>
                              </div>
                            ) : (
                              // Under limit: Show stacked contributors
                              data.contributors.map((c, i) => {
                                const width = (c.value / kdri.limit) * 100;
                                return (
                                  <div 
                                    key={i} 
                                    style={{ width: `${width}%` }} 
                                    className={`h-full ${c.color} border-r border-white/30 last:border-0`}
                                    title={`${c.name}: ${c.value}${kdri.unit}`}
                                  />
                                );
                              })
                            )}
                          </div>
                          <div className="flex justify-end">
                            <span className={`text-[11px] font-bold ${isOver ? 'text-red-600' : 'text-slate-400'}`}>
                              {percentage.toFixed(0)}% {isOver && '⚠️ 상한초과'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="bg-slate-50 text-slate-500 text-xs py-2 px-3 rounded-lg border border-slate-200">
                          상한 기준이 없는 영양소입니다.
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.values(nutrientTotals).every(d => d.total === 0) && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    시각화할 데이터가 없습니다.
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