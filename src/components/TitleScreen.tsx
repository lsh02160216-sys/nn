import React, { useEffect } from 'react';
import { Sparkles, Flame, Eye, Shapes, Play, BookOpen } from 'lucide-react';
import { playButtonSound, startWheelSound } from '../utils/audio';

interface TitleScreenProps {
  onStart: () => void;
  onOpenGallery: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenGallery }) => {
  // Keypress Enter / Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        playButtonSound();
        startWheelSound();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  const handleStartClick = () => {
    playButtonSound();
    startWheelSound();
    onStart();
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-b from-stone-950/70 via-stone-950/40 to-stone-950/90 pointer-events-auto backdrop-blur-[2px]">
      {/* Top Header Badge */}
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/80 border border-amber-900/40 text-amber-300 text-xs font-serif">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          500년 전통의 맥 · 청송 도석(陶石) 백자
        </div>

        <button
          onClick={() => {
            playButtonSound();
            onOpenGallery();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>도자기 보관함</span>
        </button>
      </div>

      {/* Center Hero Lockup with bespoke inline SVG Title & Negative Space */}
      <div className="flex flex-col items-center justify-center text-center my-auto max-w-2xl mx-auto w-full">
        {/* Decorative Seal Symbol */}
        <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-amber-600/60 bg-amber-950/40 text-amber-300 shadow-xl">
          <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
            <circle cx="50" cy="50" r="42" strokeDasharray="6 6" />
            <path d="M50 20 C35 35 30 65 50 80 C70 65 65 35 50 20 Z" fill="currentColor" fillOpacity="0.2" />
            <circle cx="50" cy="50" r="10" fill="currentColor" />
          </svg>
        </div>

        {/* Bespoke Traditional Korean Typography Title */}
        <h1 className="text-4xl sm:text-6xl font-black text-[#faf6ee] tracking-tight font-serif mb-2 drop-shadow-md">
          청송 백자 만들기
        </h1>
        <div className="text-sm sm:text-lg text-amber-200/90 font-serif tracking-widest uppercase mb-4">
          靑 松 白 磁 · KOREAN WHITE PORCELAIN
        </div>

        <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed mb-8">
          눈처럼 희고 단단한 청송 도석 점토를 물레 위에 올려 빚어보세요.<br className="hidden sm:inline" />
          시점을 전환해 안쪽을 파내고, 전통 사기굴에서 온도를 조절해 국보급 명작을 탄생시키세요.
        </p>

        {/* Start Game CTA Button */}
        <button
          onClick={handleStartClick}
          className="group relative px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-black text-base sm:text-lg shadow-2xl border border-amber-400/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current text-amber-200 group-hover:translate-x-0.5 transition-transform" />
          <span>물레 돌리기 시작</span>
        </button>

        <div className="text-[11px] text-stone-400 mt-2 font-mono">
          [ Space 또는 Enter 키를 눌러 시작 ]
        </div>
      </div>

      {/* Feature Highlights / Control Hints */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-stone-300 text-xs">
          <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-3 flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-stone-800 text-emerald-400 shrink-0">
              <Shapes className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-stone-100">점선 실루엣 매칭</div>
              <div className="text-[11px] text-stone-400">외형이 점선과 비슷할수록 고득점</div>
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-3 flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-stone-800 text-amber-400 shrink-0">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-stone-100">하단 시점 전환 버튼</div>
              <div className="text-[11px] text-stone-400">위에서 백자 내부를 파내고 다듬기</div>
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-3 flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-stone-800 text-orange-400 shrink-0">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-stone-100">전통 사기굴 가마 소성</div>
              <div className="text-[11px] text-stone-400">1280°C 황금 온도 조절로 등급 판정</div>
            </div>
          </div>
        </div>

        {/* Flat control-hint line */}
        <div className="text-center text-[11px] text-stone-500 mt-3 font-mono">
          마우스 클릭 & 드래그: 점토 성형 · 하단 시점 버튼: 상단 내부 깎기 · 가마 장작: 온도 조절
        </div>
      </div>
    </div>
  );
};
