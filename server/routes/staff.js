const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') next();
  else res.status(403).json({ error: 'Forbidden' });
};

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.tournamentId) where.tournamentId = parseInt(req.query.tournamentId);
    
    const staff = await prisma.tournamentStaff.findMany({
      where,
      include: { user: true, tournament: { select: { name: true, slug: true } } },
      orderBy: { staffRole: 'asc' }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, requireStaff, async (req, res) => {
  const { identifier, staffRole, tournamentId } = req.body;
  if (!identifier || !staffRole || !tournamentId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { osuId: isNaN(parseInt(identifier)) ? -1 : parseInt(identifier) },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      if (!isNaN(parseInt(identifier))) {
        // Create placeholder user if osuId is provided
        user = await prisma.user.create({
          data: {
            osuId: parseInt(identifier),
            username: `User_${identifier}`,
            role: 'STAFF'
          }
        });
      } else {
        return res.status(404).json({ error: 'User not found. Ask them to login first or provide their exact osu! ID.' });
      }
    }

    // Ensure user has at least STAFF role globally if they are added as tournament staff
    if (user.role === 'PLAYER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'STAFF' }
      });
    }

    const newStaff = await prisma.tournamentStaff.create({
      data: {
        userId: user.id,
        tournamentId: parseInt(tournamentId),
        staffRole
      },
      include: { user: true }
    });

    res.json(newStaff);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This user already has this role in this tournament.' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const updated = await prisma.tournamentStaff.update({
      where: { id: parseInt(req.params.id) },
      data: { staffRole: req.body.staffRole },
      include: { user: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.tournamentStaff.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
