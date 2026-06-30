const express = require('express');
const axios = require('axios');
const prisma = require('../db');
const { requireAuth } = require('./auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'banner_' + Date.now() + ext);
  }
});
const upload = multer({ storage: storage });

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
        _count: { select: { mappools: true, schedules: true, stats: true, players: true } }
      }
    });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload banner image (Admin only)
router.post('/upload-banner', requireAuth, requireStaff, upload.single('banner'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/api/uploads/${req.file.filename}` });
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

// --- REGISTRATION ROUTES ---

// Register as Player
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const { discordId, discordName } = req.body;
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;

    const existing = await prisma.tournamentPlayer.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } }
    });
    if (existing) return res.status(400).json({ error: 'Already registered' });

    const player = await prisma.tournamentPlayer.create({
      data: { userId, tournamentId, discordId, discordName }
    });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Manual Register Player
router.post('/:id/register-manual', requireAuth, requireStaff, async (req, res) => {
  try {
    const { username } = req.body;
    const tournamentId = parseInt(req.params.id);

    if (!username) return res.status(400).json({ error: 'Username is required' });

    // Fetch user from osu api
    const token = await getOsuToken();
    const osuRes = await axios.get(`https://osu.ppy.sh/api/v2/users/${username}?key=username`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const osuUser = osuRes.data;

    // Ensure User exists in our DB
    let user = await prisma.user.findFirst({
      where: { osuId: osuUser.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          osuId: osuUser.id,
          username: osuUser.username,
          avatarUrl: osuUser.avatar_url,
          role: 'PLAYER'
        }
      });
    }

    // Check if already registered
    const existing = await prisma.tournamentPlayer.findUnique({
      where: { userId_tournamentId: { userId: user.id, tournamentId } }
    });
    
    if (existing) return res.status(400).json({ error: 'Player already registered' });

    const player = await prisma.tournamentPlayer.create({
      data: { userId: user.id, tournamentId }
    });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.response?.data?.error || error.message });
  }
});

// Register as Staff
router.post('/:id/register/staff', requireAuth, async (req, res) => {
  try {
    const { staffRole } = req.body;
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if already requested/approved for this role
    const existing = await prisma.tournamentStaff.findUnique({
      where: { userId_tournamentId_staffRole: { userId, tournamentId, staffRole } }
    });
    if (existing) return res.status(400).json({ error: 'Already applied for this role' });

    const staff = await prisma.tournamentStaff.create({
      data: { userId, tournamentId, staffRole, status: 'pending' }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all registrations
router.get('/:id/registrations', requireAuth, requireStaff, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const players = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    const staff = await prisma.tournamentStaff.findMany({
      where: { tournamentId, status: 'pending' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ players, staffRequests: staff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve/Reject Staff Request
router.put('/:id/staff/:staffId/status', requireAuth, requireStaff, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (status === 'rejected') {
      await prisma.tournamentStaff.delete({ where: { id: parseInt(req.params.staffId) } });
      return res.json({ success: true, action: 'deleted' });
    }
    const staff = await prisma.tournamentStaff.update({
      where: { id: parseInt(req.params.staffId) },
      data: { status }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Kick Player
router.delete('/:id/players/:playerId', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.tournamentPlayer.delete({ where: { id: parseInt(req.params.playerId) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public: Get Registered Players
router.get('/:id/players', async (req, res) => {
  try {
    const players = await prisma.tournamentPlayer.findMany({
      where: { tournamentId: parseInt(req.params.id) },
      include: { user: { select: { username: true, avatarUrl: true, role: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
