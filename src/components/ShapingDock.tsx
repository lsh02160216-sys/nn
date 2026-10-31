import React, { useState } from 'react';
import {
  Eye,
  Flame,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gauge,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Scissors,
} from 'lucide-react';
import { CameraViewMode, TargetPorcelain } from '../types';
import { playButtonSound, setAudioMuted, getAudioMuted } from '../utils/audio';

interface ShapingDockProps {
  target: TargetPorcelain;
  viewMode: CameraViewMode;
  onToggleView: () => void;
  similarityScore: number;
  onFireInKiln: () => void;
  onResetClay: () => void;
  wheelSpeed: number;
  onWheelSpeedChange: (speed: number) => void;
  guideVisible: boolean;
  onToggleGuide: (visible: boolean) => void;
  onChangeTarget: () => void;
  // New props for size & inside clarity
  isCutaway: boolean;
  onToggleCutaway: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  metrics: {
    mouthDiameterCm: number;
    rimThicknessMm: number;
    cavityDepthPct: number;
    heightCm: number;
  };
}

export const ShapingDock: React.FC<ShapingDockProps> = ({
  target,
  viewMode,
  onToggleView,
  similarityScore,
  onFireInKiln,
  onResetClay,
  wheelSpeed,
  onWheelSpeedChange,
  guideVisible,
  onToggleGuide,
  onChangeTarget,
  isCutaway,
  onToggleCutaway,
  onZoomIn,
  onZoomOut,
  metrics,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMuted, setIsMutedState] = useState(getAudioMuted());
  const [showTip, setShowTip] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setAudioMuted(next);
    playButtonSound();
  };

  const scoreColor =
    similarityScore >= 85
      ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40'
      : similarityScore >= 65
      ? 'text-amber-400 border-amber-500/50 bg-amber-950/40'
      : 'text-stone-300 border-stone-700 bg-stone-900/60';

  return (
    <>
      {/* Top Header Badge: Minimal & Non-occluding */}
      <div className="absolute top-4 left-4 right-4 pointer-events-none flex justify-between items-start z-10">
        <div className="pointer-events-auto bg-[#1b1511]/90 border border-stone-700/70 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-xl flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 font-semibold border border-amber-700/50">
                {target.difficulty}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-stone-100 font-serif">
                {target.name}
              </h1>
            </div>
            <p className="text-[11px] text-stone-400 line-clamp-1">{target.subtitle}</p>
          </div>

          <button
            onClick={() => {
              playButtonSound();
              onChangeTarget();
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 transition-colors cursor-pointer"
          >
            기물 변경
          </button>
        </div>

        {/* Top-Right: Target Silhouette Match Score & Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Zoom In/Out Controls */}
          <div className="flex items-center bg-[#1b1511]/90 border border-stone-700/70 rounded-2xl p-1 backdrop-blur-md shadow-xl">
            <button
              onClick={() => {
                playButtonSound();
                onZoomIn();
              }}
              title="화면 확대"
              aria-label="화면 확대"
              className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-stone-700 mx-0.5" />
            <button
              onClick={() => {
                playButtonSound();
                onZoomOut();
              }}
              title="화면 축소"
              aria-label="화면 축소"
              className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Similarity Realtime Badge */}
          <div
            className={`border rounded-2xl px-3.5 py-2 backdrop-blur-md shadow-xl flex items-center gap-2 ${scoreColor}`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 uppercase font-mono">형태 유사도</span>
              <span className="text-base sm:text-lg font-black font-mono tabular-nums leading-none">
                {similarityScore}%
              </span>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            aria-label="음소거 전환"
            className="w-10 h-10 rounded-2xl bg-[#1b1511]/90 border border-stone-700/70 flex items-center justify-center text-stone-300 hover:text-white backdrop-blur-md shadow-xl transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Interactive Helper Tip Banner */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-none z-10 w-full px-4 flex justify-center">
        <div className="pointer-events-auto bg-stone-900/90 border border-amber-900/50 rounded-full px-4 py-1 text-xs text-stone-300 backdrop-blur-sm shadow flex items-center gap-2 max-w-xl text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
          <span className="truncate">
            {viewMode === 'side'
              ? '점토 표면을 클릭하고 좌우로 드래그하여 외형을 빚으세요 (휠로 확대/축소 가능)'
              : '중앙을 드래그해 파내세요 (🟡 노란선: 외벽, 🔵 파란선: 내벽 두께)'}
          </span>
          <button
            onClick={() => setShowTip(!showTip)}
            aria-label="도움말 토글"
            className="text-stone-400 hover:text-stone-200 ml-1 shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Help Modal */}
      {showTip && (
        <div className="absolute inset-0 bg-black/65 z-30 flex items-center justify-center p-4">
          <div className="bg-[#1e1713] border-2 border-amber-800/80 rounded-2xl p-6 max-w-md w-full text-stone-200 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-200 mb-3 flex items-center gap-2 font-serif">
              <Sparkles className="w-5 h-5 text-amber-400" />
              청송 백자 빚기 요령 & 시점 안내
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-stone-300 leading-relaxed">
              <p>
                <strong>1. 크기 조절 (줌):</strong> 마우스 휠을 스크롤하거나 우측 상단의 <ZoomIn className="w-3 h-3 inline mx-0.5" /> / <ZoomOut className="w-3 h-3 inline mx-0.5" /> 버튼으로 화면 전체가 한눈에 들어오도록 자유롭게 축소/확대할 수 있습니다.
              </p>
              <p>
                <strong>2. 상단 시점 (내부 다듬기):</strong> 하단의 '시점: 상단' 버튼을 누르면 내부가 음영 처리되어 깊이감이 생기며, 입구에 <strong>🟡 노란색 가이드(외경)</strong>와 <strong>🔵 파란색 가이드(내경)</strong>가 나타나 벽 두께를 직관적으로 확인할 수 있습니다.
              </p>
              <p>
                <strong>3. 단면 투시 보기:</strong> 하단의 '단면 투시' 버튼을 누르면 백자의 반쪽이 절단되어 안쪽 바닥 깊이와 두께의 균일도를 X-Ray처럼 확인하며 빚을 수 있습니다.
              </p>
              <p>
                <strong>4. 가마 소성:</strong> 백자가 완성되면 '가마에 굽기' 버튼을 눌러 전통 사기굴에서 1280°C 황금 온도를 지켜내세요!
              </p>
            </div>
            <button
              onClick={() => setShowTip(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-sm cursor-pointer"
            >
              알겠습니다
            </button>
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock */}
      <div
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto transition-transform duration-300 ease-out flex flex-col items-center"
        style={{
          maxWidth: 'min(940px, 95vw)',
          transform: `translate(-50%, ${isCollapsed ? 'calc(100% - 38px)' : '0'})`,
        }}
      >
        {/* Real-time Inside Cavity & Rim Thickness HUD Pill (shown in Top or Cutaway view) */}
        {(viewMode === 'top' || isCutaway) && !isCollapsed && (
          <div className="mb-2 px-4 py-1.5 rounded-full bg-[#1b1511]/95 border border-stone-700 text-stone-200 text-xs font-mono shadow-xl backdrop-blur-md flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>구연부 외경:</span>
              <strong className="text-amber-300">{metrics.mouthDiameterCm}cm</strong>
            </span>
            <span className="text-stone-600">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>전 두께:</span>
              <strong className="text-sky-300">{metrics.rimThicknessMm}mm</strong>
            </span>
            <span className="text-stone-600">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>내부 깊이:</span>
              <strong className="text-emerald-300">{metrics.cavityDepthPct}%</strong>
            </span>
          </div>
        )}

        {/* Dock Drawer Collapse/Expand Tab */}
        <button
          onClick={() => {
            playButtonSound();
            setIsCollapsed(!isCollapsed);
          }}
          className="mb-1 px-4 py-1 rounded-t-xl bg-[#1e1713]/95 border-t border-x border-stone-700 text-stone-300 text-xs font-medium hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>도구함 펼치기</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              <span>도구함 접기</span>
            </>
          )}
        </button>

        {/* Main Dock Container */}
        <div className="w-full bg-[#1b1511]/95 border-2 border-stone-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-lg flex flex-wrap items-center justify-between gap-3">
          {/* Group 1: The Essential View Mode Toggle (시점 전환) & Cutaway */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                playButtonSound();
                onToggleView();
              }}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                viewMode === 'top'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50 ring-2 ring-amber-400/30'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-600'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-300" />
              <span>
                시점: {viewMode === 'side' ? '측면 (외형 다듬기)' : '상단 (내부 파내기)'}
              </span>
            </button>

            {/* Cutaway Cross Section Toggle */}
            <button
              onClick={() => {
                playButtonSound();
                onToggleCutaway();
              }}
              className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isCutaway
                  ? 'bg-sky-950/70 border-sky-500/70 text-sky-300 shadow-md ring-1 ring-sky-400/40'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" />
              <span>단면 투시 {isCutaway ? 'ON' : 'OFF'}</span>
            </button>

            {/* Guide line toggle */}
            <button
              onClick={() => {
                playButtonSound();
                onToggleGuide(!guideVisible);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                guideVisible
                  ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                  : 'bg-stone-800 border-stone-700 text-stone-400'
              }`}
            >
              점선 가이드 {guideVisible ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Group 2: Wheel Speed Control */}
          <div className="flex items-center gap-1.5 bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-800">
            <Gauge className="w-4 h-4 text-stone-400 shrink-0" />
            <span className="text-[11px] text-stone-400 mr-1 hidden sm:inline">물레:</span>
            {[
              { label: '정지', speed: 0 },
              { label: '보통', speed: 1.0 },
              { label: '빠름', speed: 1.7 },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  playButtonSound();
                  onWheelSpeedChange(opt.speed);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  wheelSpeed === opt.speed
                    ? 'bg-amber-700 text-white font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Group 3: Reset Clay & Final Kiln Action */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Reset Clay */}
            <button
              onClick={() => {
                playButtonSound();
                onResetClay();
              }}
              className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">다시 뭉치기</span>
            </button>

            {/* Fire In Kiln Button (가마에 굽기) */}
            <button
              onClick={() => {
                playButtonSound();
                onFireInKiln();
              }}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl border border-amber-400/40 active:scale-95 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-yellow-200 animate-pulse" />
              <span>가마에 굽기</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
