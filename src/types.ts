export type GameStage = 'title' | 'shaping' | 'kiln' | 'result' | 'gallery';

export type CameraViewMode = 'side' | 'top';

export type ToolType = 'hands' | 'leather' | 'rib';

export interface TargetPorcelain {
  id: string;
  name: string;
  koreanName: string;
  subtitle: string;
  description: string;
  historicalContext: string;
  difficulty: '쉬움' | '보통' | '어려움' | '명장급';
  height: number; // in virtual units (e.g. 2.0)
  baseRadius: number; // base bottom radius
  profileR: number[]; // 48 normalized outer radii [0..1]
  targetThickness: number; // target wall thickness
  tolerance: number; // tolerance band for grading
}

export interface PotteryProfile {
  slices: number; // default 48
  height: number;
  outerR: number[]; // radius along Y from 0 to slices-1
  innerR: number[]; // inner cavity radius along Y
}

export interface KilnState {
  temperature: number; // current temp in Celsius
  targetMin: number; // current target zone min
  targetMax: number; // current target zone max
  stageIndex: number; // 0: drying, 1: biscuit, 2: reduction, 3: annealing
  stageProgress: number; // 0..1 in current stage
  fuel: number; // firewood count left
  bellowsDraft: number; // 0..1 draft air level
  optimalTimeSeconds: number; // time spent in optimal zone
  totalTimeSeconds: number; // total firing elapsed time
  isOverheating: boolean;
  isUnderheating: boolean;
}

export interface FiredEvaluation {
  id: string;
  date: string;
  targetId: string;
  targetName: string;
  shapeAccuracy: number; // 0 - 100
  kilnAccuracy: number; // 0 - 100
  symmetryScore: number; // 0 - 100
  totalScore: number; // 0 - 100
  grade: '국보급' | '명품' | '수작' | '가작' | '파편';
  gradeBadge: string;
  comment: string;
  profileSnapshot: number[];
  thumbnailUrl?: string;
}
