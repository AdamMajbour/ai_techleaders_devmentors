// Demo data shared by the seed script and the E2E tests.
export const DEMO_AUTHOR = {
  // Fixed so tests can look the demo article up without any user lookup endpoint.
  id: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  email: 'ada@devmentor.local',
  name: 'Ada Mentor',
} as const;

export const DEMO_LEARNER = {
  id: '5d9c7e52-3a1b-4c8f-8d57-2f4e6a9b1c22',
  email: 'linus@devmentor.local',
  name: 'Linus Learner',
} as const;

export const DEMO_ARTICLE_TITLE = 'Getting started with mentoring';
