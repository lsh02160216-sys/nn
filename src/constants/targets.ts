import { TargetPorcelain } from '../types';

export const SLICE_COUNT = 48;

/**
 * Generates an array of 48 profile radius values [0..1] along height Y [0..1]
 */
function generateProfile(fn: (t: number) => number): number[] {
  const points: number[] = [];
  for (let i = 0; i < SLICE_COUNT; i++) {
    const t = i / (SLICE_COUNT - 1); // 0 at bottom, 1 at top
    points.push(Math.max(0.12, fn(t)));
  }
  return points;
}

export const TARGET_PORCELAINS: TargetPorcelain[] = [
  {
    id: 'moon_jar',
    name: '달항아리 (백자대호)',
    koreanName: '청송 백자 달항아리',
    subtitle: '조선 백자의 정수, 둥근 보름달의 너그러움',
    description: '눈처럼 흰 빛깔과 원만한 둥근 형태가 특징인 조선 후기 대표 백자입니다. 자연스러운 곡선미와 푸근한 양감이 어우러집니다.',
    historicalContext: '청송 도석 특유의 눈꽃 같은 미백색과 은은한 결이 살아있는 명품 달항아리입니다.',
    difficulty: '명장급',
    height: 1.85,
    baseRadius: 0.40,
    targetThickness: 0.07,
    tolerance: 0.12,
    // Bottom: 0.40, swells to ~0.78 at mid-height (t=0.52), narrows to 0.44 at neck, short flared lip 0.48
    profileR: generateProfile((t) => {
      if (t < 0.1) return 0.40 + t * 0.7;
      if (t < 0.85) {
        // Swelling sphere
        const center = 0.5;
        const norm = (t - center) / 0.38;
        const rad = Math.sqrt(Math.max(0, 1 - norm * norm * 0.75));
        return 0.44 + rad * 0.36;
      }
      // Neck and lip
      const nt = (t - 0.85) / 0.15;
      return 0.42 + nt * 0.08;
    }),
  },
  {
    id: 'wine_bottle',
    name: '백자 주병 (술병)',
    koreanName: '청송 백자 주병',
    subtitle: '단아하고 우아하게 뻗은 긴 목과 풍만한 몸체',
    description: '제례나 연회에서 맑은 청주를 담던 주병입니다. 아래쪽은 팽이처럼 풍만하고 위쪽 목은 단아하게 뻗어있습니다.',
    historicalContext: '사대부의 절제된 기품과 청송 백토의 맑은 울림을 간직한 주병입니다.',
    difficulty: '어려움',
    height: 1.95,
    baseRadius: 0.38,
    targetThickness: 0.065,
    tolerance: 0.11,
    profileR: generateProfile((t) => {
      if (t < 0.4) {
        const bt = t / 0.4;
        return 0.38 + Math.sin(bt * Math.PI * 0.5) * 0.35;
      } else if (t < 0.75) {
        const nt = (t - 0.4) / 0.35;
        return 0.73 - Math.sin(nt * Math.PI * 0.5) * 0.49;
      } else {
        const lt = (t - 0.75) / 0.25;
        return 0.24 + Math.pow(lt, 2) * 0.08;
      }
    }),
  },
  {
    id: 'tea_bowl',
    name: '백자 사발 (다완)',
    koreanName: '청송 백자 다완',
    subtitle: '차 향을 품어 안는 유려하고 넉넉한 전선',
    description: '부드러운 사발 곡선과 시원하게 벌어진 구연부가 돋보이는 다완입니다. 손에 쥐었을 때 도석 백자의 따스한 온기가 감돕니다.',
    historicalContext: '청송 백자는 얇고 가벼워 찻잔과 사발로 으뜸으로 꼽혔습니다.',
    difficulty: '쉬움',
    height: 1.45,
    baseRadius: 0.30,
    targetThickness: 0.055,
    tolerance: 0.14,
    profileR: generateProfile((t) => {
      return 0.30 + Math.pow(t, 0.75) * 0.48;
    }),
  },
  {
    id: 'maebyeong',
    name: '백자 매병 (매화병)',
    koreanName: '청송 백자 매병',
    subtitle: '당당하게 솟은 어깨와 유려하게 흐르는 허리곡선',
    description: '매화 가지를 꽂아두던 기품 있는 병으로, 당당한 어깨와 잘록한 허리선에서 한국미의 극치를 느낄 수 있습니다.',
    historicalContext: '도석의 단단함으로 빚어낸 곡선이 고결한 선비의 지조를 닮아있습니다.',
    difficulty: '어려움',
    height: 2.05,
    baseRadius: 0.36,
    targetThickness: 0.07,
    tolerance: 0.12,
    profileR: generateProfile((t) => {
      if (t < 0.15) {
        return 0.36 + t * 0.35;
      } else if (t < 0.6) {
        const wt = (t - 0.15) / 0.45;
        return 0.41 + Math.sin(wt * Math.PI) * 0.13;
      } else if (t < 0.9) {
        const st = (t - 0.6) / 0.3;
        return 0.52 + Math.sin(st * Math.PI * 0.5) * 0.27;
      } else {
        const mt = (t - 0.9) / 0.1;
        return 0.79 - mt * 0.54;
      }
    }),
  },
  {
    id: 'brush_pot',
    name: '백자 필통 (호)',
    koreanName: '청송 백자 원통호',
    subtitle: '절제된 담백함, 곧고 단정한 선비의 벗',
    description: '선비의 문방사우를 꽂아두던 곧고 단정한 원통형 기물입니다. 군더더기 없는 직선과 미묘한 배흘림 곡선이 매력입니다.',
    historicalContext: '청송 백자의 담백하고 청아한 멋이 가장 순수하게 드러나는 명작입니다.',
    difficulty: '보통',
    height: 1.65,
    baseRadius: 0.44,
    targetThickness: 0.075,
    tolerance: 0.13,
    profileR: generateProfile((t) => {
      return 0.44 + Math.sin(t * Math.PI) * 0.07;
    }),
  },
];

export function getRandomTarget(): TargetPorcelain {
  const index = Math.floor(Math.random() * TARGET_PORCELAINS.length);
  return TARGET_PORCELAINS[index];
}
