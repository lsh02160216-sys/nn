import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Download, RotateCcw, Award, CheckCircle, Flame, Shapes, Sparkles, BookOpen } from 'lucide-react';
import { FiredEvaluation, TargetPorcelain } from '../types';
import { playMasterpieceGong, playButtonSound } from '../utils/audio';

interface ResultStageProps {
  target: TargetPorcelain;
  shapeScore: number;
  kilnScore: number;
  onRestart: () => void;
  onCaptureSnapshot: () => string;
  onOpenGallery: () => void;
}

export const ResultStage: React.FC<ResultStageProps> = ({
  target,
  shapeScore,
  kilnScore,
  onRestart,
  onCaptureSnapshot,
  onOpenGallery,
}) => {
  const [evaluation, setEvaluation] = useState<FiredEvaluation | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Play celebratory traditional chime
    playMasterpieceGong();

    // Calculate total score: 55% shape + 35% kiln + 10% finish bonus
    const symmetryBonus = Math.min(100, Math.round(shapeScore * 0.95 + kilnScore * 0.05));
    const totalScore = Math.min(
      100,
      Math.round(shapeScore * 0.55 + kilnScore * 0.35 + symmetryBonus * 0.1)
    );

    let grade: '국보급' | '명품' | '수작' | '가작' | '파편' = '가작';
    let gradeBadge = 'B';
    let comment = '';

    if (totalScore >= 94) {
      grade = '국보급';
      gradeBadge = '국보 SSS';
      comment =
        '청송 도석의 맑은 숨결과 한 치의 흐트러짐 없는 곡선이 경지에 도달했습니다. 조선 백자의 기품을 계승한 국보급 명작입니다!';
      // Confetti burst for national treasure
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#e2d9cc', '#fcd34d', '#34d399', '#f59e0b'],
      });
    } else if (totalScore >= 84) {
      grade = '명품';
      gradeBadge = '명품 S';
      comment =
        '가마 소성 온도가 탁월하여 백자 유약의 빛깔이 투명하고 단아합니다. 격조 높은 조선 사대부의 기품이 서려있는 명품입니다.';
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else if (totalScore >= 72) {
      grade = '수작';
      gradeBadge = '수작 A';
      comment =
        '형태가 단정하고 가마 온도를 슬기롭게 다스렸습니다. 찻물이나 맑은 청주를 담아두기에 흠잡을 곳 없는 아름다운 수작입니다.';
    } else if (totalScore >= 58) {
      grade = '가작';
      gradeBadge = '가작 B';
      comment =
        '청송 백자의 담백한 질감은 살아있으나, 어깨선과 가마 온도 조절에 약간의 아쉬움이 남습니다. 다음 작품에서 더 정교한 손길을 기대합니다.';
    } else {
      grade = '파편';
      gradeBadge = '파기 C';
      comment =
        '형태 왜곡이나 가마 온도 불균형으로 기물에 미세한 균열이 생겼습니다. 옛 명장들이 그러하듯 가차없이 깨뜨리고 다시 물레를 돌려보세요!';
    }

    const initialSnapshot = onCaptureSnapshot();
    setSnapshotUrl(initialSnapshot);

    const evalRecord: FiredEvaluation = {
      id: 'eval_' + Date.now(),
      date: new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      targetId: target.id,
      targetName: target.koreanName,
      shapeAccuracy: shapeScore,
      kilnAccuracy: kilnScore,
      symmetryScore: symmetryBonus,
      totalScore,
      grade,
      gradeBadge,
      comment,
      profileSnapshot: target.profileR,
      thumbnailUrl: initialSnapshot,
    };

    setEvaluation(evalRecord);

    // Save to localStorage collection gallery
    try {
      const stored = localStorage.getItem('cheongsong_baekja_collection');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(evalRecord);
      localStorage.setItem('cheongsong_baekja_collection', JSON.stringify(list.slice(0, 30)));
    } catch {
      // ignore
    }
  }, [shapeScore, kilnScore, target, onCaptureSnapshot]);

  // Save/Download Certificate Image
  const handleDownloadMasterpiece = () => {
    if (!evaluation) return;
    playButtonSound();

    // Render composited high-res certificate on an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background traditional Korean textured paper (한지 감성)
    ctx.fillStyle = '#171412';
    ctx.fillRect(0, 0, 1200, 1400);

    // Decorative Korean double border
    ctx.strokeStyle = '#856345';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 1340);
    ctx.strokeStyle = '#4a3423';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, 1120, 1320);

    // Header Title
    ctx.fillStyle = '#e8d8c3';
    ctx.font = 'bold 44px "Noto Serif KR", serif';
    ctx.textAlign = 'center';
    ctx.fillText('청송 백자 명작 감정서 (靑松白磁)', 600, 110);

    ctx.fillStyle = '#a8927e';
    ctx.font = '24px "Noto Serif KR", serif';
    ctx.fillText(`작품명: ${target.koreanName}`, 600, 155);

    // Draw the 3D snapshot image
    if (snapshotUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw centered
        ctx.drawImage(img, 200, 190, 800, 600);

        // Scores Box
        ctx.fillStyle = '#221b16';
        ctx.fillRect(150, 830, 900, 240);
        ctx.strokeStyle = '#634731';
        ctx.strokeRect(150, 830, 900, 240);

        ctx.fillStyle = '#f4e9db';
        ctx.font = 'bold 28px "Noto Serif KR", serif';
        ctx.textAlign = 'left';
        ctx.fillText(`형태 유사도: ${evaluation.shapeAccuracy}%`, 200, 890);
        ctx.fillText(`가마 소성도: ${evaluation.kilnAccuracy}%`, 200, 950);
        ctx.fillText(`종합 평점: ${evaluation.totalScore}점`, 200, 1010);

        // Stamp Seal (낙관)
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 6;
        ctx.strokeRect(820, 870, 160, 160);
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 36px "Gowun Batang", serif';
        ctx.textAlign = 'center';
        ctx.fillText('청송', 900, 935);
        ctx.fillText(evaluation.grade, 900, 995);

        // Master Comment
        ctx.fillStyle = '#d6c5b2';
        ctx.font = 'italic 22px "Noto Serif KR", serif';
        ctx.textAlign = 'center';
        ctx.fillText(`"${evaluation.comment}"`, 600, 1140);

        // Date and footer
        ctx.fillStyle = '#8f7b6a';
        ctx.font = '20px sans-serif';
        ctx.fillText(`소성 일자: ${evaluation.date} | 청송백자연구회 공인`, 600, 1260);

        // Download trigger
        const link = document.createElement('a');
        link.download = `청송백자_${target.name}_${evaluation.grade}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsSaved(true);
      };
      img.src = snapshotUrl;
    }
  };

  if (!evaluation) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-20 overflow-y-auto">
      {/* Top Header Badge */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full text-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs font-semibold backdrop-blur-md shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-400" />
          가마 소성 완료 · 청송백자 명장 감정
        </span>
      </div>

      {/* Main Appraisal Certificate Card */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full bg-[#1b1511]/95 border-2 border-amber-800/70 rounded-2xl p-5 sm:p-7 text-stone-200 shadow-2xl backdrop-blur-lg my-auto">
        {/* Certificate Title */}
        <div className="text-center border-b border-amber-900/50 pb-4 mb-5">
          <h2 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight font-serif">
            청송 백자 명작 감정서
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            {target.koreanName} · {evaluation.date}
          </p>
        </div>

        {/* Grade Banner & Traditional Stamp */}
        <div className="flex items-center justify-between bg-stone-900/80 border border-stone-800 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-300">
              <Award className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">최종 감정 등급</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-200 font-serif">
                {evaluation.grade}
                <span className="text-xs sm:text-sm ml-2 font-normal text-amber-400/90 font-mono">
                  ({evaluation.totalScore}점)
                </span>
              </div>
            </div>
          </div>

          {/* Traditional Korean Red Seal (낙관) */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 sm:border-3 border-red-600 bg-red-950/40 rounded-lg flex flex-col items-center justify-center text-red-500 font-serif font-black select-none shadow-inner rotate-3 transform">
            <span className="text-[11px] sm:text-xs">청송</span>
            <span className="text-sm sm:text-base font-bold">{evaluation.grade}</span>
          </div>
        </div>

        {/* Detailed Score Breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Shape Match Score */}
          <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Shapes className="w-4 h-4 text-emerald-400" />
              <span>외형 유사도</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300 tabular-nums">
              {evaluation.shapeAccuracy}%
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">점선 가이드 곡선 일치율</div>
          </div>

          {/* Kiln Score */}
          <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>가마 소성도</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-orange-300 tabular-nums">
              {evaluation.kilnAccuracy}%
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">1280°C 황금 온도 유지율</div>
          </div>
        </div>

        {/* Master Comment */}
        <div className="bg-[#15100d] border border-amber-950 p-4 rounded-xl mb-6">
          <div className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            도예 명장의 감정평
          </div>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-serif italic">
            "{evaluation.comment}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadMasterpiece}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-xl active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isSaved ? '감정서 저장 완료!' : '작품 사진 저장하기'}
          </button>

          <button
            onClick={() => {
              playButtonSound();
              onOpenGallery();
            }}
            className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-medium flex items-center justify-center gap-2 text-sm active:scale-95 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>도자기 보관함</span>
          </button>

          <button
            onClick={() => {
              playButtonSound();
              onRestart();
            }}
            className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-medium flex items-center justify-center gap-2 text-sm active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>새 백자 빚기</span>
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div className="pointer-events-auto text-center text-xs text-stone-500 pb-2">
        마우스 드래그로 완성된 백자의 자태를 360도로 감상할 수 있습니다.
      </div>
    </div>
  );
};
