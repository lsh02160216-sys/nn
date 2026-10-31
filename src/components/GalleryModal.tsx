import React, { useEffect, useState } from 'react';
import { X, Award, Trash2, Calendar, Shapes, Flame } from 'lucide-react';
import { FiredEvaluation } from '../types';
import { playButtonSound } from '../utils/audio';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose }) => {
  const [collection, setCollection] = useState<FiredEvaluation[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('cheongsong_baekja_collection');
        if (stored) {
          setCollection(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  const handleDelete = (id: string) => {
    playButtonSound();
    const updated = collection.filter((item) => item.id !== id);
    setCollection(updated);
    localStorage.setItem('cheongsong_baekja_collection', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1b1511] border-2 border-amber-800/80 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-stone-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-950 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-amber-100 font-serif flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              청송 백자 도자기 보관함
            </h2>
            <p className="text-xs text-stone-400">지금까지 직접 물레를 돌려 빚고 구워낸 나만의 백자 컬렉션</p>
          </div>
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

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {collection.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p className="text-base font-serif mb-2">아직 완성된 백자가 없습니다.</p>
              <p className="text-xs">물레 위에서 백자를 빚고 가마에 구워 첫 번째 명작을 보관함에 채워보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collection.map((item) => {
                const gradeColor =
                  item.grade === '국보급'
                    ? 'border-amber-500/80 text-amber-300 bg-amber-950/40'
                    : item.grade === '명품'
                    ? 'border-emerald-500/80 text-emerald-300 bg-emerald-950/40'
                    : 'border-stone-600 text-stone-300 bg-stone-900/40';

                return (
                  <div
                    key={item.id}
                    className="bg-stone-900/80 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-800/60 transition-all shadow-lg"
                  >
                    <div>
                      {item.thumbnailUrl && (
                        <div className="w-full h-36 bg-stone-950 rounded-lg overflow-hidden mb-3 relative flex items-center justify-center border border-stone-800">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.targetName}
                            className="w-full h-full object-contain"
                          />
                          <span
                            className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-xs font-bold border ${gradeColor}`}
                          >
                            {item.grade}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-amber-100 font-serif text-sm">
                          {item.targetName}
                        </h4>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {item.totalScore}점
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-stone-400 mb-2">
                        <span className="flex items-center gap-1">
                          <Shapes className="w-3 h-3 text-emerald-400" />
                          외형 {item.shapeAccuracy}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          가마 {item.kilnAccuracy}%
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-300 italic line-clamp-2 mb-2 font-serif">
                        "{item.comment}"
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.date}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-stone-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="기록 삭제"
                        aria-label="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
