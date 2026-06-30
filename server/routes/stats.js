const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('./auth');
const multer = require('multer');
const xlsx = require('xlsx');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const requireStaff = (req, res, next) => {
  if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') next();
  else res.status(403).json({ error: 'Forbidden' });
};

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.tournamentId) where.tournamentId = parseInt(req.query.tournamentId);
    
    const stats = await prisma.playerStat.findMany({
      where,
      include: { user: true, tournament: { select: { name: true, slug: true } } },
      orderBy: { score: 'desc' }
    });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mp', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

    // Fetch MatchScores
    const matchScores = await prisma.matchScore.findMany({
      where: { tournamentId: parseInt(tournamentId) }
    });

    // Fetch Mappools for mapping the beatmapId to Pick (NM1, HD1...)
    const mappools = await prisma.mappool.findMany({
      where: { tournamentId: parseInt(tournamentId) }
    });

    res.json({ matchScores, mappools });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', requireAuth, requireStaff, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const tournamentId = parseInt(req.body.tournamentId);
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let imported = 0;
    for (const row of data) {
      const osuId = parseInt(row['OsuId'] || row['osuId']);
      if (!osuId) continue;

      let user = await prisma.user.findUnique({ where: { osuId } });
      if (!user) {
        user = await prisma.user.create({
          data: { osuId, username: row['Username'] || `User_${osuId}`, role: 'PLAYER' }
        });
      }

      const stage = row['Stage'] || 'Unknown';
      await prisma.playerStat.upsert({
        where: { userId_tournamentId_stage: { userId: user.id, tournamentId, stage } },
        update: {
          score: parseInt(row['Score'] || 0),
          accuracy: parseFloat(row['Accuracy'] || 0),
          misses: parseInt(row['Misses'] || 0)
        },
        create: {
          userId: user.id,
          tournamentId,
          stage,
          score: parseInt(row['Score'] || 0),
          accuracy: parseFloat(row['Accuracy'] || 0),
          misses: parseInt(row['Misses'] || 0)
        }
      });
      imported++;
    }

    res.json({ success: true, imported });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process excel file' });
  }
});

router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const updated = await prisma.playerStat.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.playerStat.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
