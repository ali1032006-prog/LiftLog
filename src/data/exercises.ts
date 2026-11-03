export type Equipment =
  | 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Smith Machine' | 'Kettlebell'
  | 'Bodyweight' | 'Band' | 'EZ Bar' | 'Plate' | 'Trap Bar' | 'Weighted' | 'Assisted' | 'Other';

export type MuscleGroup =
  | 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Forearms' | 'Abs'
  | 'Quadriceps' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Adductors' | 'Abductors'
  | 'Traps' | 'Lower Back' | 'Full Body' | 'Neck';

export type LibraryExercise = { name: string; muscle: MuscleGroup; equipment: Equipment };

export const EQUIPMENT_LIST: Equipment[] = [
  'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Smith Machine', 'Kettlebell', 'EZ Bar',
  'Trap Bar', 'Plate', 'Band', 'Bodyweight', 'Weighted', 'Assisted', 'Other',
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Traps', 'Abs', 'Lower Back',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Adductors', 'Abductors', 'Neck', 'Full Body',
];

const B: Equipment = 'Barbell';
const D: Equipment = 'Dumbbell';
const C: Equipment = 'Cable';
const M: Equipment = 'Machine';
const S: Equipment = 'Smith Machine';
const K: Equipment = 'Kettlebell';
const BW: Equipment = 'Bodyweight';
const BD: Equipment = 'Band';
const EZ: Equipment = 'EZ Bar';
const P: Equipment = 'Plate';
const T: Equipment = 'Trap Bar';
const W: Equipment = 'Weighted';
const A: Equipment = 'Assisted';
const O: Equipment = 'Other';

const BASE: [base: string, muscle: MuscleGroup, equipment: Equipment[]][] = [
  // Chest
  ['Bench Press', 'Chest', [B, D, S]],
  ['Incline Bench Press', 'Chest', [B, D, S]],
  ['Decline Bench Press', 'Chest', [B, D, S]],
  ['Wide Grip Bench Press', 'Chest', [B]],
  ['Floor Press', 'Chest', [B, D]],
  ['Squeeze Press', 'Chest', [D]],
  ['Chest Press', 'Chest', [M]],
  ['Incline Chest Press', 'Chest', [M]],
  ['Decline Chest Press', 'Chest', [M]],
  ['Chest Fly', 'Chest', [D, C, M, BD]],
  ['Incline Chest Fly', 'Chest', [D, C]],
  ['Decline Chest Fly', 'Chest', [D]],
  ['Low to High Chest Fly', 'Chest', [C]],
  ['High to Low Chest Fly', 'Chest', [C]],
  ['Pec Deck', 'Chest', [M]],
  ['Pullover', 'Chest', [D, B, M]],
  ['Svend Press', 'Chest', [P]],
  ['Push Up', 'Chest', [BW, W, BD]],
  ['Incline Push Up', 'Chest', [BW]],
  ['Decline Push Up', 'Chest', [BW]],
  ['Wide Grip Push Up', 'Chest', [BW]],
  ['Knee Push Up', 'Chest', [BW]],
  ['Archer Push Up', 'Chest', [BW]],
  ['Plyometric Push Up', 'Chest', [BW]],
  ['Chest Dip', 'Chest', [BW, W, A]],

  // Back
  ['Pull Up', 'Back', [BW, W, A]],
  ['Chin Up', 'Back', [BW, W, A]],
  ['Wide Grip Pull Up', 'Back', [BW, W]],
  ['Neutral Grip Pull Up', 'Back', [BW, W]],
  ['Scapular Pull Up', 'Back', [BW]],
  ['Muscle Up', 'Back', [BW]],
  ['Lat Pulldown', 'Back', [C, M, BD]],
  ['Wide Grip Lat Pulldown', 'Back', [C]],
  ['Close Grip Lat Pulldown', 'Back', [C]],
  ['Reverse Grip Lat Pulldown', 'Back', [C]],
  ['Single Arm Lat Pulldown', 'Back', [C]],
  ['Straight Arm Pulldown', 'Back', [C, BD]],
  ['Bent Over Row', 'Back', [B, D, S]],
  ['Reverse Grip Bent Over Row', 'Back', [B]],
  ['Pendlay Row', 'Back', [B]],
  ['Single Arm Row', 'Back', [D, C, K]],
  ['Kroc Row', 'Back', [D]],
  ['Seated Row', 'Back', [C, M, BD]],
  ['Wide Grip Seated Row', 'Back', [C]],
  ['Single Arm Seated Row', 'Back', [C]],
  ['T Bar Row', 'Back', [B, M]],
  ['Chest Supported Row', 'Back', [D, M]],
  ['Meadows Row', 'Back', [B]],
  ['Seal Row', 'Back', [B, D]],
  ['Inverted Row', 'Back', [BW]],
  ['Renegade Row', 'Back', [D, K]],
  ['Gorilla Row', 'Back', [K]],
  ['Iso Lateral Row', 'Back', [M]],
  ['Low Row', 'Back', [M]],
  ['High Row', 'Back', [M, C]],
  ['Rack Pull', 'Back', [B, T]],

  // Deadlift family / posterior chain
  ['Deadlift', 'Lower Back', [B, D, K, S, T]],
  ['Deficit Deadlift', 'Lower Back', [B]],
  ['Snatch Grip Deadlift', 'Lower Back', [B]],
  ['Sumo Deadlift', 'Glutes', [B, D, K]],
  ['Romanian Deadlift', 'Hamstrings', [B, D, K, S, BD]],
  ['Single Leg Romanian Deadlift', 'Hamstrings', [D, K]],
  ['Stiff Leg Deadlift', 'Hamstrings', [B, D]],
  ['Good Morning', 'Hamstrings', [B, S, BD]],
  ['Back Extension', 'Lower Back', [BW, W, M]],
  ['Superman', 'Lower Back', [BW]],
  ['Jefferson Curl', 'Lower Back', [B, D]],
  ['Reverse Hyperextension', 'Glutes', [BW, M]],

  // Glutes / hips
  ['Hip Thrust', 'Glutes', [B, D, M, S, BD, BW]],
  ['Single Leg Hip Thrust', 'Glutes', [BW, D]],
  ['Glute Bridge', 'Glutes', [B, D, BD, BW]],
  ['Single Leg Glute Bridge', 'Glutes', [BW]],
  ['Glute Kickback', 'Glutes', [C, M, BD]],
  ['Donkey Kick', 'Glutes', [BW]],
  ['Frog Pump', 'Glutes', [BW, D]],
  ['Pull Through', 'Glutes', [C, BD]],
  ['Swing', 'Glutes', [K, D]],
  ['Single Arm Swing', 'Glutes', [K]],
  ['Hip Abduction', 'Abductors', [M, C, BD]],
  ['Lateral Walk', 'Abductors', [BD]],
  ['Clamshell', 'Abductors', [BW, BD]],
  ['Fire Hydrant', 'Abductors', [BW, BD]],
  ['Side Lying Leg Raise', 'Abductors', [BW]],
  ['Hip Adduction', 'Adductors', [M, C]],
  ['Copenhagen Plank', 'Adductors', [BW]],

  // Quads / squats / lunges
  ['Squat', 'Quadriceps', [BW, B, D, S]],
  ['Front Squat', 'Quadriceps', [B, D, K, S]],
  ['Goblet Squat', 'Quadriceps', [D, K]],
  ['Box Squat', 'Quadriceps', [B]],
  ['Pause Squat', 'Quadriceps', [B]],
  ['Overhead Squat', 'Quadriceps', [B, D]],
  ['Zercher Squat', 'Quadriceps', [B]],
  ['Sumo Squat', 'Adductors', [D, K]],
  ['Hack Squat', 'Quadriceps', [M, B]],
  ['Pendulum Squat', 'Quadriceps', [M]],
  ['Belt Squat', 'Quadriceps', [M]],
  ['Sissy Squat', 'Quadriceps', [BW, W]],
  ['Pistol Squat', 'Quadriceps', [BW, K]],
  ['Jump Squat', 'Quadriceps', [BW, B, D]],
  ['Split Squat', 'Quadriceps', [BW, B, D, S]],
  ['Bulgarian Split Squat', 'Quadriceps', [BW, B, D, K, S]],
  ['Lunge', 'Quadriceps', [BW, B, D, K, S]],
  ['Walking Lunge', 'Quadriceps', [BW, B, D, K]],
  ['Reverse Lunge', 'Quadriceps', [BW, B, D, K, S]],
  ['Lateral Lunge', 'Adductors', [BW, D, K]],
  ['Curtsy Lunge', 'Glutes', [BW, D]],
  ['Step Up', 'Quadriceps', [BW, B, D]],
  ['Leg Press', 'Quadriceps', [M]],
  ['Single Leg Press', 'Quadriceps', [M]],
  ['Horizontal Leg Press', 'Quadriceps', [M]],
  ['Leg Extension', 'Quadriceps', [M]],
  ['Single Leg Extension', 'Quadriceps', [M]],
  ['Wall Sit', 'Quadriceps', [BW, W]],

  // Hamstrings
  ['Lying Leg Curl', 'Hamstrings', [M, D]],
  ['Seated Leg Curl', 'Hamstrings', [M]],
  ['Standing Leg Curl', 'Hamstrings', [M, C, BD]],
  ['Nordic Hamstring Curl', 'Hamstrings', [BW]],
  ['Glute Ham Raise', 'Hamstrings', [BW]],
  ['Sliding Leg Curl', 'Hamstrings', [BW]],

  // Calves
  ['Standing Calf Raise', 'Calves', [BW, B, D, M, S]],
  ['Seated Calf Raise', 'Calves', [M, B, D]],
  ['Single Leg Calf Raise', 'Calves', [BW, D]],
  ['Donkey Calf Raise', 'Calves', [M, BW]],
  ['Calf Press', 'Calves', [M]],
  ['Tibialis Raise', 'Calves', [BW, P]],

  // Shoulders
  ['Overhead Press', 'Shoulders', [B, D, K, S, BD]],
  ['Seated Overhead Press', 'Shoulders', [B, D]],
  ['Single Arm Overhead Press', 'Shoulders', [D, K]],
  ['Shoulder Press', 'Shoulders', [M]],
  ['Arnold Press', 'Shoulders', [D]],
  ['Push Press', 'Shoulders', [B, D, K]],
  ['Behind the Neck Press', 'Shoulders', [B, S]],
  ['Z Press', 'Shoulders', [B, D]],
  ['Landmine Press', 'Shoulders', [B]],
  ['Single Arm Landmine Press', 'Shoulders', [B]],
  ['Bottoms Up Press', 'Shoulders', [K]],
  ['Handstand Push Up', 'Shoulders', [BW]],
  ['Pike Push Up', 'Shoulders', [BW]],
  ['Lateral Raise', 'Shoulders', [D, C, M, BD]],
  ['Seated Lateral Raise', 'Shoulders', [D]],
  ['Single Arm Lateral Raise', 'Shoulders', [D, C]],
  ['Front Raise', 'Shoulders', [D, B, C, P, BD]],
  ['Reverse Fly', 'Shoulders', [D, C, M, BD]],
  ['Rear Delt Row', 'Shoulders', [D, C]],
  ['Face Pull', 'Shoulders', [C, BD]],
  ['Upright Row', 'Shoulders', [B, D, C, EZ, S]],
  ['Cuban Press', 'Shoulders', [D]],
  ['External Rotation', 'Shoulders', [C, D, BD]],
  ['Internal Rotation', 'Shoulders', [C, BD]],
  ['Y Raise', 'Shoulders', [D, C]],
  ['Pull Apart', 'Shoulders', [BD]],
  ['Halo', 'Shoulders', [K, P]],
  ['Overhead Carry', 'Shoulders', [D, K]],
  ['Log Press', 'Shoulders', [O]],

  // Traps
  ['Shrug', 'Traps', [B, D, C, M, S, T]],
  ['Behind the Back Shrug', 'Traps', [B, S]],
  ['High Pull', 'Traps', [B, K]],

  // Biceps
  ['Bicep Curl', 'Biceps', [B, D, C, EZ, M, BD, K]],
  ['Seated Bicep Curl', 'Biceps', [D]],
  ['Single Arm Bicep Curl', 'Biceps', [C, D]],
  ['Hammer Curl', 'Biceps', [D, C, BD]],
  ['Cross Body Hammer Curl', 'Biceps', [D]],
  ['Preacher Curl', 'Biceps', [B, D, EZ, M, C]],
  ['Concentration Curl', 'Biceps', [D]],
  ['Spider Curl', 'Biceps', [B, D, EZ]],
  ['Incline Curl', 'Biceps', [D]],
  ['Bayesian Curl', 'Biceps', [C]],
  ['Overhead Curl', 'Biceps', [C]],
  ['Drag Curl', 'Biceps', [B, EZ]],
  ['Zottman Curl', 'Biceps', [D]],
  ['Waiter Curl', 'Biceps', [D]],
  ['Wide Grip Curl', 'Biceps', [B, EZ]],
  ['21s', 'Biceps', [B, EZ, D]],

  // Triceps
  ['Triceps Pushdown', 'Triceps', [C, BD]],
  ['Triceps Rope Pushdown', 'Triceps', [C]],
  ['Reverse Grip Triceps Pushdown', 'Triceps', [C]],
  ['Single Arm Triceps Pushdown', 'Triceps', [C]],
  ['Skullcrusher', 'Triceps', [B, D, EZ, C]],
  ['Overhead Triceps Extension', 'Triceps', [D, C, EZ, B, BD]],
  ['Single Arm Overhead Triceps Extension', 'Triceps', [D, C]],
  ['Cross Body Triceps Extension', 'Triceps', [C]],
  ['Triceps Extension', 'Triceps', [M]],
  ['Triceps Dip', 'Triceps', [BW, W, A, M]],
  ['Bench Dip', 'Triceps', [BW, W]],
  ['Triceps Kickback', 'Triceps', [D, C, BD]],
  ['Close Grip Bench Press', 'Triceps', [B, D, S]],
  ['JM Press', 'Triceps', [B, S]],
  ['Tate Press', 'Triceps', [D]],
  ['Diamond Push Up', 'Triceps', [BW]],

  // Forearms
  ['Reverse Curl', 'Forearms', [B, D, EZ, C]],
  ['Wrist Curl', 'Forearms', [B, D, C]],
  ['Reverse Wrist Curl', 'Forearms', [B, D, C]],
  ['Behind the Back Wrist Curl', 'Forearms', [B]],
  ['Wrist Roller', 'Forearms', [O]],
  ['Plate Pinch', 'Forearms', [P]],
  ['Dead Hang', 'Forearms', [BW, W]],

  // Abs / core
  ['Crunch', 'Abs', [BW, W, M]],
  ['Kneeling Crunch', 'Abs', [C, BD]],
  ['Decline Crunch', 'Abs', [BW, W]],
  ['Bicycle Crunch', 'Abs', [BW]],
  ['Reverse Crunch', 'Abs', [BW]],
  ['Oblique Crunch', 'Abs', [BW]],
  ['Sit Up', 'Abs', [BW, W]],
  ['Decline Sit Up', 'Abs', [BW, W]],
  ['Jackknife Sit Up', 'Abs', [BW]],
  ['V Up', 'Abs', [BW]],
  ['Toes to Bar', 'Abs', [BW]],
  ['Hanging Leg Raise', 'Abs', [BW, W]],
  ['Hanging Knee Raise', 'Abs', [BW]],
  ['Lying Leg Raise', 'Abs', [BW]],
  ["Captain's Chair Leg Raise", 'Abs', [BW]],
  ['Plank', 'Abs', [BW, W]],
  ['Side Plank', 'Abs', [BW]],
  ['Ab Wheel Rollout', 'Abs', [BW]],
  ['Rollout', 'Abs', [B]],
  ['Russian Twist', 'Abs', [BW, D, K, P]],
  ['Woodchop', 'Abs', [C, D, BD]],
  ['Pallof Press', 'Abs', [C, BD]],
  ['Dead Bug', 'Abs', [BW]],
  ['Hollow Hold', 'Abs', [BW]],
  ['L Sit', 'Abs', [BW]],
  ['Dragon Flag', 'Abs', [BW]],
  ['Side Bend', 'Abs', [D, C]],
  ['Heel Touch', 'Abs', [BW]],
  ['Flutter Kick', 'Abs', [BW]],
  ['Windshield Wiper', 'Abs', [BW]],
  ['Landmine 180', 'Abs', [B]],
  ['Torso Rotation', 'Abs', [M, C]],
  ['Windmill', 'Abs', [K]],
  ['Suitcase Carry', 'Abs', [D, K]],

  // Olympic lifts / full body
  ['Clean', 'Full Body', [B, D, K]],
  ['Power Clean', 'Full Body', [B, D]],
  ['Hang Clean', 'Full Body', [B, K]],
  ['Hang Power Clean', 'Full Body', [B]],
  ['Clean Pull', 'Full Body', [B]],
  ['Snatch', 'Full Body', [B, D, K]],
  ['Power Snatch', 'Full Body', [B]],
  ['Hang Snatch', 'Full Body', [B]],
  ['Snatch Pull', 'Full Body', [B]],
  ['Clean and Jerk', 'Full Body', [B]],
  ['Clean and Press', 'Full Body', [B, D, K]],
  ['Split Jerk', 'Full Body', [B]],
  ['Push Jerk', 'Full Body', [B]],
  ['Thruster', 'Full Body', [B, D, K]],
  ['Turkish Get Up', 'Full Body', [K, D]],
  ["Farmer's Walk", 'Full Body', [D, K, T]],
  ['Yoke Carry', 'Full Body', [O]],
  ['Sled Push', 'Full Body', [O]],
  ['Sled Pull', 'Full Body', [O]],
  ['Atlas Stone', 'Full Body', [O]],
  ['Tire Flip', 'Full Body', [O]],

  // Neck
  ['Neck Curl', 'Neck', [P, BW, M]],
  ['Neck Extension', 'Neck', [P, BW, M]],
  ['Lateral Neck Curl', 'Neck', [P, BW]],
];

export const LIBRARY_EXERCISES: LibraryExercise[] = BASE.flatMap(([base, muscle, equipment]) =>
  equipment.map((eq) => ({
    name: eq === 'Bodyweight' ? base : `${base} (${eq})`,
    muscle,
    equipment: eq,
  })),
).sort((a, b) => a.name.localeCompare(b.name));

const LIBRARY_NAME_SET = new Set(LIBRARY_EXERCISES.map((e) => e.name.toLowerCase()));

/** True for built-in exercises; false for ones people created themselves. */
export function isLibraryExercise(name: string): boolean {
  return LIBRARY_NAME_SET.has(name.trim().toLowerCase());
}
