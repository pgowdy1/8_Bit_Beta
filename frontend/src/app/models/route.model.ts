export interface Move {
  label: string;
  detail?: string;
}

export interface Pitch {
  grade: string;
  lengthFt: number;
  description: string;
  moves?: Move[];
}

export interface Route {
  name: string;
  featureName: string;
  pitches: Pitch[];
}

export function emptyPitch(): Pitch {
  return { grade: '5.10a', lengthFt: 100, description: '', moves: [] };
}

export function emptyMove(): Move {
  return { label: '', detail: '' };
}

export function seedRoute(): Route {
  return {
    name: 'The Nose',
    featureName: 'El Capitan',
    pitches: [
      {
        grade: '5.11c',
        lengthFt: 120,
        description: 'Start up the obvious crack system. Bouldery moves off the deck guard a finger crack.',
        moves: [
          { label: 'Stem off the boulder', detail: 'High step right onto the flake.' },
          { label: 'Finger lock crux', detail: 'Sink a left-hand finger jam and pull through to a stance.' },
        ],
      },
      {
        grade: '5.10b',
        lengthFt: 165,
        description: 'Sustained hand and fist crack to Sickle Ledge. Place gear often; the rock is featured.',
      },
      {
        grade: '5.9',
        lengthFt: 140,
        description: 'Easy ramp left to the next belay below the Stoveleg cracks.',
      },
      {
        grade: '5.10a',
        lengthFt: 180,
        description: 'Stoveleg crack 1: classic 4-inch hand jamming. Bring big cams.',
        moves: [
          { label: 'Hand jam sequence', detail: 'Left, right, left in the splitter for 30 feet.' },
        ],
      },
    ],
  };
}
