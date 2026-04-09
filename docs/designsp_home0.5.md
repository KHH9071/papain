<!-- [ASSUMPTION] 현재 앱(1-3)의 주 타겟인 밀레니얼/Z세대 부모는 육아 앱에서 '아기자기함'보다 '금융 앱 수준의 전문성과 데이터 신뢰도'를 요구한다.

[ASSUMPTION] 경쟁사 앱(4-7)이 세련되어 보이는 핵심 이유는 정보의 밀도 통제와 선(Border)의 제거를 통한 '인지 부하(Cognitive Load)' 감소에 있다.

[ASSUMPTION] 개방감을 주기 위해 단순히 여백만 늘리면 핵심 데이터(영양 충족도 등)의 스캐너빌리티(Scannability)가 훼손된다. 따라서 타이포그래피의 대비(Contrast) 극대화가 필수적이다.

[Core Reasoning]
기존 앱의 가장 큰 패착은 모든 정보를 '박스(Box)'와 '배경색' 안에 가두려는 강박이다. 베이지색 배경 위에 둥근 박스를 얹고, 그 안에 다시 색상이 들어간 버튼과 게이지를 배치했다. 이는 시각적 노이즈를 발생시키며 정보의 위계를 무너뜨린다.
반면, 참조한 타사 앱은 형태심리학(Gestalt)의 근접성 원리를 활용해 테두리 없이 여백만으로 정보 그룹을 나눈다.
타사를 뛰어넘으려면 그들의 '단순함'을 모방하는 것을 넘어, **'데이터 시각화의 정밀도'**를 끌어올려야 한다. 프로그레스 바(게이지)는 두껍고 둔탁한 형태에서 얇고 정교한 대시보드 형태로 변경되어야 하며, 텍스트는 색상과 굵기(Weight)를 극단적으로 대비시켜 사용자가 0.1초 만에 '충족/부족/초과'를 인지하게 만들어야 한다.

[Risks & Blind Spots]

감성적 연결의 부재: 극도로 모던하고 차가운 디자인(타사 스타일)을 맹목적으로 추종할 경우, '내 아이를 위한 따뜻한 서비스'라는 브랜드 감성이 증발할 수 있다. 색상은 절제하되, 핵심 컴포넌트(아이콘, 성장 마일스톤)에 곡선과 따뜻한 포인트 컬러(예: Soft Coral, Warm Yellow)를 전략적으로 배치해야 한다.

과도한 스크롤 길이: 여백을 늘리면 한 화면에 담기는 정보량이 줄어든다. 핵심 요약 정보(1개 상한 초과 등)는 상단에 고정하거나 배지(Badge) 형태로 압축해야 한다.

[Strategic Implications]
디자인의 고도화는 단순한 심미성 개선이 아니다. '데이터를 정밀하게 다루는 프리미엄 서비스'라는 인식을 심어주면, 향후 맞춤형 영양제 구독이나 프리미엄 리포트 같은 유료 과금 모델(BM) 도입 시 사용자의 지불 의향(Willingness to Pay)을 획기적으로 높이는 시스템적 레버리지가 된다.

[Immediate Actions]

배경 및 컨테이너 플래트닝(Flattening): 의미 없는 베이지색 백그라운드 박스를 전면 제거하고, Absolute White(#FFFFFF) 배경 위에서 컴포넌트가 호흡하게 만든다.

프로그레스 바 리팩토링: 두꺼운 막대그래프를 얇은 선형 트랙으로 변경하고, 목표치(Target)를 수직선으로 날카롭게 표시하여 '목표 달성 여부'에 시선을 집중시킨다.

타이포그래피 위계 재설정: 데이터의 핵심 수치(예: 1044mg)는 볼드하게, 부가 설명(목표 500)은 크기와 대비를 낮춰(Gray-400) 정보의 주연과 조연을 명확히 분리한다. -->

import React, { useState } from 'react';
import { 
  Baby, 
  MessageCircle, 
  Activity, 
  Heart, 
  Utensils, 
  ChevronRight,
  Home,
  Search,
  BarChart2,
  Coffee,
  User,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white px-5 py-4 sticky top-0 z-10 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden">
            <span className="text-xl">👶</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">우리아이 영양설계</h1>
            <p className="text-xs text-gray-500 mt-0.5">12~35개월 기준</p>
          </div>
        </div>
        <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5">
          <button className="text-gray-400 hover:text-gray-700 font-medium px-1">-</button>
          <span className="text-sm font-bold text-orange-600 px-2">26개월</span>
          <button className="text-gray-400 hover:text-gray-700 font-medium px-1">+</button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 pb-24">
        
        {/* Insight Banner - Redesigned for minimal cognitive load */}
        <section className="bg-white px-5 py-6 mb-2">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-600 tracking-wide">STAGE INSIGHT</span>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-medium text-gray-600">유아 초기 시기</span>
            </div>
            <div className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-sm flex items-center gap-1">
              <AlertCircle size={10} strokeWidth={3} />
              1개 상한 초과
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-snug tracking-tight mb-4">
            칼슘·철분·아연을<br/>함께 살펴보는 경우가 많아요
          </h2>
          <div className="flex gap-2 mb-5">
            {['칼슘', '철', '아연', '비타민D'].map((item) => (
              <span key={item} className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                {item}
              </span>
            ))}
          </div>
          <button className="flex items-center justify-center w-full py-3.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl text-sm transition-colors duration-200">
            탐색 탭에서 더 살펴보기
            <ChevronRight size={16} className="ml-1" />
          </button>
        </section>

        {/* Milestone Section - Removed boxy borders, utilized whitespace */}
        <section className="bg-white px-5 py-8 mb-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1">
              ✨ 26개월 성장 마일스톤
            </h3>
            <p className="text-sm text-gray-500 mt-1">조금 느려도 괜찮아요. 아이만의 속도를 응원해주세요.</p>
          </div>

          <div className="border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="inline-block bg-orange-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-sm tracking-widest uppercase mb-3">
              Month 26 Focus
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-5 tracking-tight">
              걷기와 자기 표현이<br/>빠르게 발달해요
            </h4>
            
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 mb-6">
              <span className="text-xl">💡</span>
              <p className="text-sm font-medium text-gray-800">오늘 아이가 처음으로 해본 것이 있었나요?</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              <MilestoneItem icon={<MessageCircle size={20} className="text-purple-500" strokeWidth={1.5}/>} label="인지·언어" />
              <MilestoneItem icon={<Activity size={20} className="text-blue-500" strokeWidth={1.5}/>} label="신체·운동" />
              <MilestoneItem icon={<Heart size={20} className="text-rose-500" strokeWidth={1.5}/>} label="정서·사회성" />
              <MilestoneItem icon={<Utensils size={20} className="text-gray-700" strokeWidth={1.5}/>} label="식습관" />
            </div>

            <button className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition-colors duration-200 flex items-center justify-center shadow-md shadow-orange-200">
              성장 기록 남기기
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </section>

        {/* Nutrition Status - High precision data visualization */}
        <section className="bg-white px-5 py-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1">
              <CheckCircle2 size={18} className="text-gray-400" />
              오늘의 영양 현황
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                분유·우유
              </div>
            </div>
          </div>

          <div className="space-y-7">
            {/* Nutrition Bar Item */}
            <NutritionBar 
              name="칼슘" 
              status="충족" 
              statusColor="green"
              current="1044" 
              unit="mg" 
              target="500" 
              limit="2500" 
              progress={100}
              targetPercent={48}
            />
            
            <NutritionBar 
              name="철" 
              status="충족" 
              statusColor="green"
              current="9.6" 
              unit="mg" 
              target="6" 
              limit="40" 
              progress={24}
              targetPercent={15}
            />

            <NutritionBar 
              name="아연" 
              status="충족" 
              statusColor="green"
              current="4.48" 
              unit="mg" 
              target="3" 
              limit="6" 
              progress={74}
              targetPercent={50}
            />

            <NutritionBar 
              name="비타민D" 
              status="충족" 
              statusColor="green"
              current="14.8" 
              unit="μg" 
              target="5" 
              limit="30" 
              progress={49}
              targetPercent={16}
            />
            
            <NutritionBar 
              name="비타민A" 
              status="초과" 
              statusColor="red"
              current="950" 
              unit="μg RE" 
              target="300" 
              limit="600" 
              progress={100}
              isOverLimit={true}
              targetPercent={31}
              limitPercent={63}
            />
          </div>
        </section>
      </main>

      {/* Bottom Navigation - Minimalist & Refined */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 max-w-md mx-auto pb-safe">
        <div className="flex justify-around items-center pt-3 pb-4">
          <NavItem icon={<Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 1.5} />} label="홈" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<Search size={24} strokeWidth={activeTab === 'search' ? 2.5 : 1.5} />} label="탐색" isActive={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <NavItem icon={<BarChart2 size={24} strokeWidth={activeTab === 'record' ? 2.5 : 1.5} />} label="기록" isActive={activeTab === 'record'} onClick={() => setActiveTab('record')} />
          <NavItem icon={<Coffee size={24} strokeWidth={activeTab === 'lounge' ? 2.5 : 1.5} />} label="라운지" isActive={activeTab === 'lounge'} onClick={() => setActiveTab('lounge')} />
          <NavItem icon={<User size={24} strokeWidth={activeTab === 'my' ? 2.5 : 1.5} />} label="마이" isActive={activeTab === 'my'} onClick={() => setActiveTab('my')} />
        </div>
      </nav>
    </div>
  );
}

// Sub-components

function MilestoneItem({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[11px] font-medium text-gray-600">{label}</span>
    </div>
  );
}

function NutritionBar({ name, status, statusColor, current, unit, target, limit, progress, targetPercent, isOverLimit = false, limitPercent }) {
  const badgeClasses = {
    green: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    red: "bg-red-50 text-red-600 border border-red-100",
  };

  return (
    <div className="w-full group cursor-pointer">
      {/* Header Info */}
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">{name}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${badgeClasses[statusColor]}`}>
            {status}
          </span>
        </div>
        <div className="text-right">
          <span className={`font-bold text-base tracking-tight ${isOverLimit ? 'text-red-500' : 'text-gray-900'}`}>
            {current}
          </span>
          <span className="text-xs font-medium text-gray-500 ml-0.5">{unit}</span>
          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
            목표 {target} · 상한 {limit}
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
        {/* Fill */}
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-400' : 'bg-blue-400'}`}
          style={{ width: `${progress}%` }}
        />
        
        {/* Target Marker */}
        <div 
          className="absolute top-0 w-[2px] h-full bg-gray-800 z-10"
          style={{ left: `${targetPercent}%` }}
        />

        {/* Limit Marker (if applicable and visible on scale) */}
        {limitPercent && (
           <div 
           className="absolute top-0 w-[2px] h-full bg-red-600 z-10"
           style={{ left: `${limitPercent}%` }}
         />
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 w-16 transition-colors ${isActive ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {icon}
      <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}