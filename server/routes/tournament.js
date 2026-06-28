const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') next();
  else res.status(403).json({ error: 'Forbidden' });
};

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { mappools: true, schedules: true, stats: true } }
      }
    });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tournament by slug
router.get('/:slug', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { slug: req.params.slug },
      include: {
        staff: { include: { user: true } },
        _count: { select: { mappools: true, schedules: true, stats: true } }
      }
    });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tournament (Admin only)
router.post('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const tournament = await prisma.tournament.create({ data: req.body });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tournament (Admin only)
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const tournament = await prisma.tournament.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tournament (Admin only)
router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.tournament.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
