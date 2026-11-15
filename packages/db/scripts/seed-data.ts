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

export const DEMO_PERSONAS = {
  mentee: {
    id: '196785e3-35bc-4d8d-b20f-913e71bd3510',
    email: 'mock-mentee@devmentor.test',
    name: 'Mock Mentee',
    password: 'mock-mentee-password',
    invitationRole: 'seeker',
  },
  mentor: {
    id: 'fc4bd617-489b-46db-ad60-ddfb194fa1af',
    email: 'mock-mentor@devmentor.test',
    name: 'Mock Mentor',
    invitationRole: 'mentor',
  },
  mentorFrontend: {
    id: '9d19c92c-83a4-41a2-a5fb-8f7d8ca2d901',
    email: 'frontend-mentor@devmentor.test',
    name: 'Maja Nowak',
    password: 'demo-mentor-password',
    invitationRole: 'mentor',
  },
  mentorBackend: {
    id: '0f915db2-c3be-4a3c-95fb-48be19c0f44a',
    email: 'backend-mentor@devmentor.test',
    name: 'Tomasz Zieliński',
    password: 'demo-mentor-password',
    invitationRole: 'mentor',
  },
  operator: {
    id: '7bb1d923-bf91-4fd2-868b-d03526fe829e',
    email: 'mock-operator@devmentor.test',
    name: 'Mock Operator',
    password: 'mock-operator-password',
    invitationRole: 'mentor',
  },
  ada: {
    id: 'b7e31ad2-7e2d-4fb0-9154-13f006cdd477',
    email: 'ada@devmentor.dev',
    name: 'Ada Test Mentor',
    invitationRole: 'mentor',
  },
  noBioMentor: {
    id: 'd27a86ee-19ac-40a3-9b13-195759b686b0',
    email: 'mentor-without-bio@devmentor.test',
    name: 'Sam Example',
    invitationRole: 'mentor',
  },
} as const;
