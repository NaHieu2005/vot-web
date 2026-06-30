const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('./auth');
const { generateBracket8, generateBracket16 } = require('../utils/bracketGenerator');
const { syncBracketToSchedule } = require('../utils/bracketSync');

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') next();
  else res.status(403).json({ error: 'Forbidden' });
};

// Get bracket nodes for a tournament
router.get('/', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });
    
    const nodes = await prisma.bracketNode.findMany({
      where: { tournamentId: parseInt(tournamentId) },
      orderBy: [
        { bracketType: 'desc' }, // Custom sort: just alphabetical is fine for now, frontend will group
        { round: 'asc' },
        { matchOrder: 'asc' }
      ]
    });
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create bracket node
router.post('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const data = { ...req.body };
    data.tournamentId = parseInt(data.tournamentId);
    data.round = parseInt(data.round);
    data.matchOrder = parseInt(data.matchOrder);
    
    const node = await prisma.bracketNode.create({ data });
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Bracket
router.post('/generate', requireAuth, requireStaff, async (req, res) => {
  try {
    const { tournamentId, size, round1Matchups, roundBestOfs } = req.body;
    if (size !== 8 && size !== 16) return res.status(400).json({ error: 'Only size 8 and 16 are supported for auto-generation' });
    
    // Delete existing bracket nodes
    await prisma.bracketNode.deleteMany({ where: { tournamentId: parseInt(tournamentId) } });

    const matches = size === 8 ? generateBracket8(parseInt(tournamentId), round1Matchups, roundBestOfs) : generateBracket16(parseInt(tournamentId), round1Matchups, roundBestOfs);
    
    // Insert all nodes
    const matchObjects = Object.values(matches).map(m => {
      const { internalId, nextWinnerMatchId, nextLoserMatchId, ...rest } = m;
      return rest;
    });

    await prisma.bracketNode.createMany({ data: matchObjects });

    // Now we need to update the nextWinnerMatchId and nextLoserMatchId with actual DB IDs
    const createdNodes = await prisma.bracketNode.findMany({ where: { tournamentId: parseInt(tournamentId) } });
    
    // Create a map from matchIdentifier -> DB ID
    const idMap = {};
    createdNodes.forEach(n => { idMap[n.matchIdentifier] = n.id; });

    // Update nodes
    for (const mId in matches) {
      const m = matches[mId];
      if (m.nextWinnerMatchId || m.nextLoserMatchId) {
        await prisma.bracketNode.update({
          where: { id: idMap[mId] },
          data: {
            nextWinnerMatchId: m.nextWinnerMatchId ? idMap[m.nextWinnerMatchId] : null,
            nextLoserMatchId: m.nextLoserMatchId ? idMap[m.nextLoserMatchId] : null,
          }
        });
      }
    }

    // Call sync to auto-generate any newly filled matches
    await syncBracketToSchedule(parseInt(tournamentId));

    res.json({ success: true, count: createdNodes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bracket node
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const { player1, player2, score1, score2, isCompleted, bracketType, round, matchOrder } = req.body;
    
    const data = { player1, player2, isCompleted, bracketType };
    if (round !== undefined) data.round = parseInt(round);
    if (matchOrder !== undefined) data.matchOrder = parseInt(matchOrder);
    if (score1 !== undefined) data.score1 = score1 === '' ? null : parseInt(score1);
    if (score2 !== undefined) data.score2 = score2 === '' ? null : parseInt(score2);

    const node = await prisma.bracketNode.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bracket node
router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.bracketNode.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
