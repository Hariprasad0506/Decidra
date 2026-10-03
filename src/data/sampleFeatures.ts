import type { Feature } from '../types'

// Predefined GymBuddy sample features shown on first load.
export const sampleFeatures: Feature[] = [
  {
    id: 'F-001',
    name: 'Beginner Workout Planner',
    description: 'A guided weekly plan that helps new members start training with confidence.',
    status: 'Idea',
    reach: 2000,
    impact: 2,
    confidence: 80,
    effort: 3,
    evidenceNote: 'Exit surveys show many new members leave because they do not know where to start.',
    dependencyNote: '',
  },
  {
    id: 'F-002',
    name: 'Exercise Demonstration Videos',
    description: 'Short videos showing correct form for each exercise in the library.',
    status: 'Idea',
    reach: 3500,
    impact: 1,
    confidence: 50,
    effort: 4,
    evidenceNote: 'Assumption: members want form guidance, based on a handful of support requests.',
    dependencyNote: 'Needs a decision on where videos are hosted.',
  },
  {
    id: 'F-003',
    name: 'Workout Reminder Notifications',
    description: 'Timely nudges that help members keep to their training schedule.',
    status: 'Idea',
    reach: 5000,
    impact: 0.5,
    confidence: 100,
    effort: 1.5,
    evidenceNote: 'A small pilot with reminders increased weekly visits.',
    dependencyNote: '',
  },
]
