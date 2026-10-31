import React, { useEffect, useState, useRef } from 'react';
import { Flame, Wind, Droplets, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { playWoodStokeSound, playButtonSound } from '../utils/audio';

interface KilnControllerProps {
  onKilnComplete: (kilnAccuracy: number) => void;
  onTemperatureUpdate: (temp: number, min: number, max: number) => void;
}

interface KilnPhase {
  name: string;
  subName: string;
  durationSec: number;
  minTemp: number;
  maxTemp: number;
  desc: string;
}

const KILN_PHASES: KilnPhase[] = [
  {
    name: '1단계: 잔여 수분 건조',
    subName: '은은한 불길로 수분 배출',
    durationSec: 6,
    minTemp: 250,
    maxTemp: 450,
    desc: '급격한 가열은 점토를 터지게 만듭니다. 서서히 온도를 350°C 안팎으로 끌어올리세요.',
  },
  {
    name: '2단계: 초벌 소성 (소결)',
    subName: '점토 입자 결합 및 가열',
    durationSec: 8,
    minTemp: 750,
    maxTemp: 920,
    desc: '장작을 적절히 투입하여 850°C 부근을 안정적으로 유지하세요.',
  },
  {
    name: '3단계: 본벌 환원소성 (핵심!)',
    subName: '청송 백자 특유의 백색 결정화',
    durationSec: 12,
    minTemp: 1240,
    maxTemp: 1300,
    desc: '가장 중요한 순간! 소나무 장작과 불문을 조절해 1270°C 황금 온도를 지켜내세요.',
  },
  {
    name: '4단계: 서냉 및 유약 안정',
    subName: '자연 냉각과 결정 고정',
    durationSec: 6,
    minTemp: 600,
    maxTemp: 850,
    desc: '불을 줄이고 서서히 식혀 투명하고 단단한 빙렬과 순백색 유약을 완성합니다.',
  },
];

export const KilnController: React.FC<KilnControllerProps> = ({
  onKilnComplete,
  onTemperatureUpdate,
}) => {
  const [temperature, setTemperature] = useState(180);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [firewood, setFirewood] = useState(12);
  const [damperLevel, setDamperLevel] = useState(0.5); // 0 (closed) to 1 (full open)
  const [optimalTime, setOptimalTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [heatVelocity, setHeatVelocity] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentPhase = KILN_PHASES[phaseIndex];
  const isOptimal = temperature >= currentPhase.minTemp && temperature <= currentPhase.maxTemp;
  const isOverheating = temperature > currentPhase.maxTemp;
  const isUnderheating = temperature < currentPhase.minTemp;

  // Refs for loop
  const tempRef = useRef(temperature);
  tempRef.current = temperature;
  const velRef = useRef(heatVelocity);
  velRef.current = heatVelocity;

  // Kiln physical simulation step
  useEffect(() => {
    if (isFinished) return;

    const interval = setInterval(() => {
      setTotalTime((prev) => prev + 0.2);
      setPhaseTime((prev) => {
        const nextTime = prev + 0.2;
        if (nextTime >= currentPhase.durationSec) {
          if (phaseIndex < KILN_PHASES.length - 1) {
            setPhaseIndex((p) => p + 1);
            return 0;
          } else {
            // Kiln firing finished!
            setIsFinished(true);
            return currentPhase.durationSec;
          }
        }
        return nextTime;
      });

      // Ambient heat loss vs current fire
      // Ambient cooling pull towards ~80°C
      const coolingRate = (tempRef.current - 80) * 0.02 * (0.8 + (1 - damperLevel) * 0.4);
      // Draft air amplifies burning heat if damper is open
      const draftBurn = damperLevel * 14;

      const newVel = velRef.current * 0.88; // decay
      setHeatVelocity(newVel);

      setTemperature((curr) => {
        let nextTemp = curr + newVel + draftBurn - coolingRate;
        nextTemp = Math.max(120, Math.min(1450, nextTemp));
        onTemperatureUpdate(nextTemp, currentPhase.minTemp, currentPhase.maxTemp);
        return Math.round(nextTemp);
      });

      // Score accumulation
      if (tempRef.current >= currentPhase.minTemp && tempRef.current <= currentPhase.maxTemp) {
        setOptimalTime((prev) => prev + 0.2);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phaseIndex, currentPhase, damperLevel, isFinished, onTemperatureUpdate]);

  // When finished, compute accuracy and call onKilnComplete
  useEffect(() => {
    if (isFinished) {
      const totalRequiredTime = KILN_PHASES.reduce((acc, p) => acc + p.durationSec, 0);
      const ratio = Math.min(1, optimalTime / (totalRequiredTime * 0.82));
      const accuracyScore = Math.max(40, Math.min(100, Math.round(ratio * 100)));
      setTimeout(() => {
        onKilnComplete(accuracyScore);
      }, 1200);
    }
  }, [isFinished, optimalTime, onKilnComplete]);

  // Player action: Feed Pine Firewood (장작 넣기)
  const handleStokeWood = () => {
    if (firewood <= 0 || isFinished) return;
    playWoodStokeSound();
    setFirewood((f) => f - 1);
    setHeatVelocity((v) => v + 35);
  };

  // Player action: Cool Vent (환기/물뿌리기)
  const handleVentCool = () => {
    if (isFinished) return;
    playButtonSound();
    setHeatVelocity((v) => v - 45);
  };

  // Progress percentage across all phases
  const totalPhaseDuration = KILN_PHASES.reduce((acc, p) => acc + p.durationSec, 0);
  const elapsedBeforeCurrent = KILN_PHASES.slice(0, phaseIndex).reduce((acc, p) => acc + p.durationSec, 0);
  const overallProgress = Math.min(100, Math.round(((elapsedBeforeCurrent + phaseTime) / totalPhaseDuration) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-20">
      {/* Top Banner: Kiln Status */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full bg-[#1e1713]/90 border border-amber-900/60 rounded-xl p-4 text-stone-200 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-950/80 border border-orange-700/60 text-orange-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-100 flex items-center gap-2">
                청송 사기굴 (전통 장작 가마)
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">
                  {currentPhase.name}
                </span>
              </h2>
              <p className="text-xs text-stone-400">{currentPhase.subName}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-400">전체 소성 공정</span>
            <div className="text-sm font-bold text-amber-300 tabular-nums">{overallProgress}%</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800 mb-3">
          <div
            className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Phase instructions */}
        <p className="text-xs text-stone-300 bg-stone-900/70 p-2.5 rounded-lg border border-stone-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{currentPhase.desc}</span>
        </p>
      </div>

      {/* Center Thermometer & Zone Gauge */}
      <div className="pointer-events-auto max-w-md mx-auto w-full flex flex-col items-center gap-2">
        {/* Status Bubble */}
        <div
          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border shadow-lg transition-all ${
            isOptimal
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80'
              : isOverheating
              ? 'bg-red-950/90 text-red-300 border-red-500/80 animate-bounce'
              : 'bg-blue-950/90 text-blue-300 border-blue-500/80'
          }`}
        >
          {isOptimal ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              황금 적정 온도 유지 중! 유약이 맑게 녹아듭니다
            </>
          ) : isOverheating ? (
            <>
              <AlertTriangle className="w-4 h-4 text-red-400" />
              과열 경고! 온도를 즉시 낮추세요 (기물 파손 위험)
            </>
          ) : (
            <>
              <Wind className="w-4 h-4 text-blue-400" />
              온도 부족! 소나무 장작을 더 넣으세요
            </>
          )}
        </div>

        {/* Big Temperature Gauge */}
        <div className="bg-[#17120f]/95 border-2 border-stone-700/80 rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center w-full">
          <div className="text-xs text-stone-400 uppercase tracking-widest font-mono">가마 내부 온도</div>
          <div className="flex items-baseline gap-1 my-1">
            <span
              className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums ${
                isOptimal ? 'text-amber-300' : isOverheating ? 'text-red-400' : 'text-blue-300'
              }`}
            >
              {temperature}
            </span>
            <span className="text-xl font-bold text-stone-400">°C</span>
          </div>

          <div className="text-xs text-amber-200/90 flex items-center gap-1 font-mono">
            <span>목표 구간:</span>
            <span className="font-bold text-emerald-300">
              {currentPhase.minTemp}°C ~ {currentPhase.maxTemp}°C
            </span>
          </div>

          {/* Linear Gauge Bar with Target Zone */}
          <div className="w-full h-5 bg-stone-950 rounded-full mt-3 relative overflow-hidden border border-stone-700">
            {/* Target zone band */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/35 border-x-2 border-emerald-400"
              style={{
                left: `${Math.max(0, Math.min(100, ((currentPhase.minTemp - 100) / 1300) * 100))}%`,
                width: `${Math.max(
                  4,
                  Math.min(100, ((currentPhase.maxTemp - currentPhase.minTemp) / 1300) * 100)
                )}%`,
              }}
            />
            {/* Current temperature pointer needle */}
            <div
              className={`absolute top-0 bottom-0 w-2.5 rounded-full transform -translate-x-1/2 transition-all duration-150 ${
                isOptimal ? 'bg-amber-300 ring-2 ring-white shadow-lg' : 'bg-red-500 ring-1 ring-red-300'
              }`}
              style={{
                left: `${Math.max(0, Math.min(100, ((temperature - 100) / 1300) * 100))}%`,
              }}
            />
          </div>
          <div className="w-full flex justify-between text-[10px] text-stone-500 font-mono mt-1 px-1">
            <span>100°C</span>
            <span>700°C</span>
            <span className="text-emerald-400 font-bold">1280°C</span>
            <span>1400°C</span>
          </div>
        </div>
      </div>

      {/* Bottom Control Dock: Firewood, Damper, Venting */}
      <div className="pointer-events-auto max-w-lg mx-auto w-full bg-[#1e1713]/95 border border-amber-900/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {/* Stoke Pine Firewood Button */}
          <button
            onClick={handleStokeWood}
            disabled={firewood <= 0 || isFinished}
            className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
              firewood > 0 && !isFinished
                ? 'bg-gradient-to-b from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white border border-orange-400/40 cursor-pointer'
                : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
            }`}
          >
            <Flame className="w-5 h-5 text-amber-200" />
            <div className="flex flex-col text-left">
              <span className="text-sm">소나무 장작 넣기</span>
              <span className="text-[10px] text-amber-200/80 font-normal">남은 장작: {firewood}개</span>
            </div>
          </button>

          {/* Quick Cool Vent Button */}
          <button
            onClick={handleVentCool}
            disabled={isFinished}
            className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-medium flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer"
          >
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span>가마 식히기</span>
          </button>
        </div>

        {/* Damper / Air Draft Slider */}
        <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 flex items-center gap-3">
          <Wind className="w-4 h-4 text-stone-400 shrink-0" />
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-stone-300">
              <span>가마 불문 (공기 유입량)</span>
              <span className="font-mono text-amber-400">
                {damperLevel < 0.35 ? '닫힘 (환원염)' : damperLevel > 0.7 ? '활짝 열림 (급연소)' : '보통'}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={damperLevel}
              onChange={(e) => setDamperLevel(parseFloat(e.target.value))}
              disabled={isFinished}
              aria-label="가마 불문 공기 유입량 조절"
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {isFinished && (
          <div className="text-center py-2 text-amber-300 font-bold text-sm animate-pulse">
            소성이 완료되었습니다! 가마 문을 열고 백자를 감정합니다...
          </div>
        )}
      </div>
    </div>
  );
};
