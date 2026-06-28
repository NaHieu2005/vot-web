const express = require('express');
const axios = require('axios');
const prisma = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') next();
  else res.status(403).json({ error: 'Forbidden' });
};

let cachedOsuToken = null;
let tokenExpiresAt = 0;

async function getOsuToken() {
  if (cachedOsuToken && Date.now() < tokenExpiresAt) {
    return cachedOsuToken;
  }
  const payload = {
    client_id: parseInt(process.env.OSU_CLIENT_ID, 10),
    client_secret: process.env.OSU_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'public'
  };
  const tokenRes = await axios.post('https://osu.ppy.sh/oauth/token', payload, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  });
  cachedOsuToken = tokenRes.data.access_token;
  tokenExpiresAt = Date.now() + (tokenRes.data.expires_in - 300) * 1000;
  return cachedOsuToken;
}

function getModBitwise(modString) {
  let bitwise = 0;
  const m = modString.toUpperCase();
  if (m.includes('HR')) bitwise |= 16;
  if (m.includes('DT')) bitwise |= 64;
  if (m.includes('HD')) bitwise |= 8;
  if (m.includes('EZ')) bitwise |= 2;
  if (m.includes('HT')) bitwise |= 256;
  return bitwise;
}

async function getModdedStats(beatmapId, modString, baseStats) {
  let { sr, hp, od, bpm, length } = baseStats;
  const token = await getOsuToken();
  const bitwise = getModBitwise(modString);
  
  if (bitwise > 0) {
    try {
      const attrRes = await axios.post(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}/attributes`, {
        mods: bitwise,
        ruleset: 'taiko'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      sr = attrRes.data.attributes.star_rating;
    } catch (e) {
      console.error('Failed to get mod attributes', e.response?.data || e.message);
    }
  }

  const m = modString.toUpperCase();
  if (m.includes('DT')) {
    bpm = bpm * 1.5;
    length = Math.floor(length / 1.5);
  } else if (m.includes('HT')) {
    bpm = bpm * 0.75;
    length = Math.floor(length / 0.75);
  }

  return { sr, hp, od, bpm, length };
}

// Get mappool (filter by tournamentId)
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.tournamentId) where.tournamentId = parseInt(req.query.tournamentId);
    
    const mappool = await prisma.mappool.findMany({
      where,
      orderBy: [{ stage: 'asc' }, { order: 'asc' }],
      include: { tournament: { select: { name: true, slug: true } } }
    });
    res.json(mappool);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add beatmap (Staff only)
router.post('/', requireAuth, requireStaff, async (req, res) => {
  const { stage, mod, beatmapId, tournamentId, picker } = req.body;
  if (!stage || !mod || !beatmapId || !tournamentId) {
    return res.status(400).json({ error: 'Missing required fields (stage, mod, beatmapId, tournamentId)' });
  }

  try {
    const token = await getOsuToken();

    const mapRes = await axios.get(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const mapData = mapRes.data;

    const baseStats = {
      sr: mapData.difficulty_rating,
      hp: mapData.drain,
      od: mapData.accuracy,
      bpm: mapData.bpm,
      length: mapData.total_length
    };

    const moddedStats = await getModdedStats(beatmapId, mod, baseStats);

    const highestOrderMap = await prisma.mappool.findFirst({
      where: { tournamentId: parseInt(tournamentId), stage },
      orderBy: { order: 'desc' }
    });
    const nextOrder = highestOrderMap ? highestOrderMap.order + 1 : 0;

    const newMap = await prisma.mappool.create({
      data: {
        tournamentId: parseInt(tournamentId),
        stage,
        mod,
        order: nextOrder,
        picker: picker || null,
        beatmapId: mapData.id,
        title: mapData.beatmapset.title,
        artist: mapData.beatmapset.artist,
        mapper: mapData.beatmapset.creator,
        diffName: mapData.version,
        sr: moddedStats.sr,
        od: moddedStats.od,
        hp: moddedStats.hp,
        bpm: moddedStats.bpm,
        length: moddedStats.length,
        coverImage: mapData.beatmapset.covers.cover
      }
    });

    res.json(newMap);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch or save beatmap' });
  }
});

// Update beatmap (Staff only)
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  const { stage, mod, picker } = req.body;
  try {
    const existing = await prisma.mappool.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Map not found' });

    let updates = { stage, mod, picker };

    if (mod && mod !== existing.mod) {
      const token = await getOsuToken();
      const mapRes = await axios.get(`https://osu.ppy.sh/api/v2/beatmaps/${existing.beatmapId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mapData = mapRes.data;
      const baseStats = {
        sr: mapData.difficulty_rating,
        hp: mapData.drain,
        od: mapData.accuracy,
        bpm: mapData.bpm,
        length: mapData.total_length
      };
      const moddedStats = await getModdedStats(existing.beatmapId, mod, baseStats);
      updates = { ...updates, ...moddedStats };
    }

    const updatedMap = await prisma.mappool.update({
      where: { id: parseInt(req.params.id) },
      data: updates
    });
    res.json(updatedMap);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update beatmap' });
  }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.mappool.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder beatmaps (Staff only)
router.post('/reorder', requireAuth, requireStaff, async (req, res) => {
  const { maps } = req.body; // Array of { id, order }
  if (!maps || !Array.isArray(maps)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const transactions = maps.map(map =>
      prisma.mappool.update({
        where: { id: map.id },
        data: { order: map.order }
      })
    );

    await prisma.$transaction(transactions);
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder maps' });
  }
});

module.exports = router;
