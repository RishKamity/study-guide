/* course.js — DEMO course (original content, written for this repo): an intro microeconomics midterm.
   Copy this folder to start a new course pack. Every field is documented in docs/CONTENT_FORMAT.md. */
A.COURSE = {
  id: 'demo-econ101',
  title: 'ECON 101 Midterm Lab',
  mark: 'E',
  course: 'ECON 101 (demo)', exam: 'Midterm 1',
  examAt: '+3d',                       /* demo only: always 3 days from today. Real courses use an ISO time with offset. */
  where: 'Demo Hall 100',
  instructor: null,
  facts: ['20 multiple choice questions, 30 minutes', 'Calculator allowed', 'Covers Units 1 and 2'],
  format: { questions: 20, options: 4, minutes: 30, points: 5 },
  units: [{ id: 1, short: 'Unit 1', name: 'Supply & demand' }, { id: 2, short: 'Unit 2', name: 'Firms & markets' }],
  tier: 'full', accent: 'sky',
  features: { audio: false },          /* the demo ships without narration; run tools/audio/render.sh to try it */
  storageKey: 'demo-econ',
  sample: { title: 'Practice Midterm' },
  tutor: { context: 'You are a tutor for an introductory microeconomics course, helping a student before Midterm 1 (supply and demand, costs, market structures).', conventions: 'a change in price moves along a curve; a change in anything else shifts the curve; marginal cost is the change in total cost from one more unit.' },
  walkIn: { title: 'ECON 101 Midterm walk-in sheet' },
  schedule: { windows: [['09:00', '12:00'], ['13:00', '17:00'], ['19:00', '22:30']], stopBeforeExam: 30 }
};
A.TOPICS = [
  { id: '1A', ch: 1, title: 'Demand, supply and what shifts them', exam: 5, pri: 'A', calc: false, mins: 10 },
  { id: '1B', ch: 1, title: 'Equilibrium and market changes', exam: 5, pri: 'A', calc: true, mins: 12 },
  { id: '2A', ch: 2, title: 'Costs of production', exam: 5, pri: 'A', calc: true, mins: 12 },
  { id: '2B', ch: 2, title: 'Perfect competition vs. monopoly', exam: 5, pri: 'B', calc: false, mins: 10 }
];
