const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(users => console.log(users)).finally(() => prisma.$disconnect());
