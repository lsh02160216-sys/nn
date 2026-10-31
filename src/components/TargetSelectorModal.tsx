import React from 'react';
import { X, Sparkles, Shuffle, ShieldAlert } from 'lucide-react';
import { TARGET_PORCELAINS, getRandomTarget } from '../constants/targets';
import { TargetPorcelain } from '../types';
import { playButtonSound } from '../utils/audio';

interface TargetSelectorModalProps {
  isOpen: boolean;
  currentTargetId: string;
  onSelectTarget: (target: TargetPorcelain) => void;
  onClose: () => void;
}

export const TargetSelectorModal: React.FC<TargetSelectorModalProps> = ({
  isOpen,
  currentTargetId,
  onSelectTarget,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleRandom = () => {
    playButtonSound();
    const rand = getRandomTarget();
    onSelectTarget(rand);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1b1511] border-2 border-amber-800/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-stone-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-950 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-amber-100 font-serif flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              청송 백자 기물 선택
            </h2>
            <p className="text-xs text-stone-400">도전하고 싶은 전통 백자의 점선 실루엣을 선택하세요</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRandom}
              className="py-1.5 px-3 rounded-xl bg-amber-800/80 hover:bg-amber-700 text-amber-100 text-xs font-bold flex items-center gap-1.5 border border-amber-600/50 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>랜덤 선택</span>
            </button>
            <button
              onClick={() => {
                playButtonSound();
                onClose();
              }}
              aria-label="닫기"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of targets */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {TARGET_PORCELAINS.map((item) => {
            const isSelected = item.id === currentTargetId;
            return (
              <div
                key={item.id}
                onClick={() => {
                  playButtonSound();
                  onSelectTarget(item);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-stone-900/70 border-stone-800 hover:border-amber-800/80 hover:bg-stone-800/60'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        item.difficulty === '명장급'
                          ? 'bg-red-950/80 text-red-300 border-red-700/60'
                          : item.difficulty === '어려움'
                          ? 'bg-orange-950/80 text-orange-300 border-orange-700/60'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      }`}
                    >
                      {item.difficulty}
                    </span>
                    <h3 className="font-bold text-base text-amber-100 font-serif">
                      {item.name}
                    </h3>
                  </div>
                  <p className="text-xs text-amber-300/80 mb-1">{item.subtitle}</p>
                  <p className="text-xs text-stone-400 line-clamp-2">{item.description}</p>
                </div>

                <div className="sm:text-right shrink-0">
                  <button
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 hover:bg-amber-700 text-stone-200 hover:text-white'
                    }`}
                  >
                    {isSelected ? '선택됨' : '도전하기'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
