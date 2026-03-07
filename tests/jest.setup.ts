afterAll(async () => {
  if (typeof window !== 'undefined') return;
  const { prisma } = await import('./setup/prisma');
  await prisma.$disconnect();
});
