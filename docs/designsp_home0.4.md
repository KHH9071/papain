              Section 3: REVISED 발달 마일스톤 
              ========================================= */}
          <section>
            <div className="flex justify-between items-end mb-3 px-1">
              <div>
                <h2 className="text-lg font-black text-stone-800 flex items-center gap-1.5">
                  <Sparkles size={18} className="text-orange-500" />
                  {DEVELOPMENT_DATA.month}개월 성장 마일스톤
                </h2>
                <p className="text-xs font-medium text-stone-500 mt-0.5">
                  조금 느려도 괜찮아요. 아이만의 속도를 응원해주세요.
                </p>
              </div>
            </div>

            {/* Soft, Blended Card Design */}
            <div className="bg-gradient-to-b from-orange-50/40 to-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(234,88,12,0.05)] border border-orange-100/60 relative overflow-hidden">
              
              {/* Background Accent Graphic */}
              <div className="absolute -right-6 -top-6 opacity-[0.03] text-orange-900 pointer-events-none">
                <BrainCircuit size={150} />
              </div>

              <div className="relative z-10">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-white border border-orange-100 text-orange-600 text-[10px] font-black tracking-widest mb-3 shadow-sm">
                  MONTH {DEVELOPMENT_DATA.month} FOCUS
                </span>
                
                <h3 className="text-[19px] font-black text-stone-800 leading-tight mb-4">
                  {DEVELOPMENT_DATA.title}
                </h3>
                
                {/* Soft Hook Box */}
                <div className="bg-white border border-orange-100/50 rounded-2xl p-4 shadow-sm mb-6">
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb size={14} className="text-orange-500" />
                    </div>
                    <p className="text-[13px] font-bold leading-relaxed text-stone-700">
                      {DEVELOPMENT_DATA.featuredQuestion}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                  {DEVELOPMENT_DATA.categories.map((cat) => (
                    <div key={cat.id} className="flex flex-col items-center gap-1.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cat.color} shadow-sm border border-white/50`}>
                        <cat.icon size={22} />
                      </div>
                      <span className="text-[10px] font-extrabold text-stone-600">{cat.name}</span>
                    </div>
                  ))}
                </div>

                {/* Strong CTA Button replaces the dark background for attention */}
                <button className="w-full bg-[#ea580c] hover:bg-orange-600 text-white font-black text-sm py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98]">
                  발달 리포트 자세히 보기 <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
          {/* ========================================= */}