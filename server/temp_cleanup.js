const prisma = require('./db');

async function cleanDB() {
  try {
    console.log('Deleting all Schedule and BracketNode records...');
    await prisma.bracketNode.deleteMany();
    await prisma.schedule.deleteMany();
    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDB();
