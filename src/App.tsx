/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { TARGET_PORCELAINS, getRandomTarget } from './constants/targets';
import { CameraViewMode, GameStage, TargetPorcelain } from './types';
import { PotterySceneManager } from './pottery/PotterySceneManager';
import { TitleScreen } from './components/TitleScreen';
import { ShapingDock } from './components/ShapingDock';
import { KilnController } from './components/KilnController';
import { ResultStage } from './components/ResultStage';
import { GalleryModal } from './components/GalleryModal';
import { TargetSelectorModal } from './components/TargetSelectorModal';
import { stopWheelSound, startWheelSound } from './utils/audio';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<PotterySceneManager | null>(null);

  // Game state
  const [gameStage, setGameStage] = useState<GameStage>('title');
  const [target, setTarget] = useState<TargetPorcelain>(TARGET_PORCELAINS[0]); // default 달항아리
  const [viewMode, setViewMode] = useState<CameraViewMode>('side');
  const [similarityScore, setSimilarityScore] = useState<number>(15);
  const [kilnScore, setKilnScore] = useState<number>(85);
  const [wheelSpeed, setWheelSpeed] = useState<number>(1.0);
  const [guideVisible, setGuideVisible] = useState<boolean>(true);
  const [isCutaway, setIsCutaway] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({
    mouthDiameterCm: 14.5,
    rimThicknessMm: 6.2,
    cavityDepthPct: 35,
    heightCm: 18.5,
  });

  // Modals
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTargetSelectorOpen, setIsTargetSelectorOpen] = useState(false);

  // Initialize Three.js Scene Manager once
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const manager = new PotterySceneManager(canvasContainerRef.current, target, {
      onScoreUpdate: (score) => {
        setSimilarityScore(score);
      },
      onPointerStateChange: (_isInteracting) => {
        // can handle subtle haptics or state
      },
      onMetricsUpdate: (m) => {
        setMetrics(m);
      },
    });

    sceneManagerRef.current = manager;

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
      stopWheelSound();
    };
  }, []);

  const handleToggleCutaway = () => {
    if (!sceneManagerRef.current) return;
    const next = sceneManagerRef.current.toggleCutaway();
    setIsCutaway(next);
  };

  const handleZoomIn = () => {
    sceneManagerRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    sceneManagerRef.current?.zoomOut();
  };

  // Sync wheel speed with audio & manager
  const handleWheelSpeedChange = (speed: number) => {
    setWheelSpeed(speed);
    sceneManagerRef.current?.setWheelSpeed(speed);
  };

  // View toggle: Side (측면) <-> Top (상단 내부)
  const handleToggleView = () => {
    if (!sceneManagerRef.current) return;
    const nextView = sceneManagerRef.current.toggleViewMode();
    setViewMode(nextView);
  };

  // Reset clay to fresh lump
  const handleResetClay = () => {
    sceneManagerRef.current?.resetClay();
  };

  // Toggle dashed target guide
  const handleToggleGuide = (visible: boolean) => {
    setGuideVisible(visible);
    sceneManagerRef.current?.setGuideVisible(visible);
  };

  // Change Target Porcelain
  const handleSelectTarget = (newTarget: TargetPorcelain) => {
    setTarget(newTarget);
    sceneManagerRef.current?.restartShaping(newTarget);
    setViewMode('side');
    setGuideVisible(true);
  };

  // Transition: Title -> Shaping
  const handleStartGame = () => {
    setGameStage('shaping');
    startWheelSound();
    sceneManagerRef.current?.restartShaping(target);
    setViewMode('side');
  };

  // Transition: Shaping -> Kiln Firing
  const handleFireInKiln = () => {
    setGameStage('kiln');
    stopWheelSound();
    sceneManagerRef.current?.enterKilnMode();
  };

  // Temperature update during kiln firing
  const handleKilnTemperatureUpdate = (temp: number, min: number, max: number) => {
    sceneManagerRef.current?.updateKilnVisuals(temp, min, max);
  };

  // Transition: Kiln Complete -> Result Stage
  const handleKilnComplete = (finalKilnScore: number) => {
    setKilnScore(finalKilnScore);
    setGameStage('result');
    sceneManagerRef.current?.enterResultMode(similarityScore);
  };

  // Restart Crafting
  const handleRestart = () => {
    const nextTarget = getRandomTarget();
    setTarget(nextTarget);
    setGameStage('shaping');
    startWheelSound();
    sceneManagerRef.current?.restartShaping(nextTarget);
    setViewMode('side');
    setGuideVisible(true);
  };

  // Snapshot capture
  const handleCaptureSnapshot = (): string => {
    return sceneManagerRef.current ? sceneManagerRef.current.captureSnapshot() : '';
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#181513] select-none font-sans">
      {/* 3D Canvas Mount (Isolated from React re-renders) */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Stage: Title Screen */}
      {gameStage === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenGallery={() => setIsGalleryOpen(true)}
        />
      )}

      {/* Stage: Shaping on Pottery Wheel */}
      {gameStage === 'shaping' && (
        <ShapingDock
          target={target}
          viewMode={viewMode}
          onToggleView={handleToggleView}
          similarityScore={similarityScore}
          onFireInKiln={handleFireInKiln}
          onResetClay={handleResetClay}
          wheelSpeed={wheelSpeed}
          onWheelSpeedChange={handleWheelSpeedChange}
          guideVisible={guideVisible}
          onToggleGuide={handleToggleGuide}
          onChangeTarget={() => setIsTargetSelectorOpen(true)}
          isCutaway={isCutaway}
          onToggleCutaway={handleToggleCutaway}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          metrics={metrics}
        />
      )}

      {/* Stage: Kiln Firing & Temperature Control */}
      {gameStage === 'kiln' && (
        <KilnController
          onKilnComplete={handleKilnComplete}
          onTemperatureUpdate={handleKilnTemperatureUpdate}
        />
      )}

      {/* Stage: Final Masterpiece Result & Grading */}
      {gameStage === 'result' && (
        <ResultStage
          target={target}
          shapeScore={similarityScore}
          kilnScore={kilnScore}
          onRestart={handleRestart}
          onCaptureSnapshot={handleCaptureSnapshot}
          onOpenGallery={() => setIsGalleryOpen(true)}
        />
      )}

      {/* Gallery Collection Modal */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      {/* Target Porcelain Selector Modal */}
      <TargetSelectorModal
        isOpen={isTargetSelectorOpen}
        currentTargetId={target.id}
        onSelectTarget={handleSelectTarget}
        onClose={() => setIsTargetSelectorOpen(false)}
      />
    </div>
  );
}
