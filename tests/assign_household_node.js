const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const email = process.argv[2] || 'admin@demo.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('User not found:', email);
      process.exit(2);
    }
    if (user.householdId) {
      console.log('User already has householdId:', user.householdId);
      process.exit(0);
    }

    let hh = await prisma.household.findFirst();
    if (!hh) {
      hh = await prisma.household.create({ data: { name: 'Default Household' } });
      console.log('Created household:', hh.id);
    } else {
      console.log('Found household:', hh.id);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { householdId: hh.id }
    });
    console.log(`Assigned householdId ${hh.id} to user ${updated.email}`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
