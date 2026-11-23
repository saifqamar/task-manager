import { createPrismaClient } from '../src/db/prisma.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const prisma = createPrismaClient(url);

const tasks = [
  {
    title: 'Review the project specs',
    description: 'The README covers architecture, API and deployment',
    completed: true,
  },
  { title: 'Try editing this task', description: 'Click the pencil icon' },
  { title: 'Mark a task as completed', description: null },
  {
    title: 'Check the weather widget',
    description: 'Click the widget in the header to change city',
  },
];

await prisma.task.deleteMany();
for (const task of tasks) await prisma.task.create({ data: task });
console.log(`Seeded ${tasks.length} tasks`);
await prisma.$disconnect();
