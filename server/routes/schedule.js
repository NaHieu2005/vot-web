const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (req.user.role === 'STAFF' || req.user.role === 'ADMIN') next();
  else res.status(403).json({ error: 'Forbidden' });
};

const axios = require('axios');
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

async function fetchPlayerAvatar(username) {
  if (!username) return null;
  try {
    const token = await getOsuToken();
    const res = await axios.get(`https://osu.ppy.sh/api/v2/users/${username}?key=username`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.avatar_url;
  } catch (e) {
    return null;
  }
}

async function sendNotification(targetUser, message, link) {
  if (!targetUser) return;
  try {
    await prisma.notification.create({
      data: { targetUser, message, link }
    });
  } catch(e) {}
}

async function notifyMatchStaff(schedule, message, link) {
  const staff = await prisma.tournamentStaff.findMany({
    where: { tournamentId: schedule.tournamentId, staffRole: 'Host' },
    include: { user: true }
  });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  
  const toNotify = new Set();
  staff.forEach(s => toNotify.add(s.user.username));
  admins.forEach(a => toNotify.add(a.username));
  
  if (schedule.streamer) toNotify.add(schedule.streamer);
  if (schedule.commentators) {
    schedule.commentators.split(',').forEach(c => toNotify.add(c.trim()));
  }

  for (const username of toNotify) {
    if (username) await sendNotification(username, message, link);
  }
}

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.tournamentId) where.tournamentId = parseInt(req.query.tournamentId);
    
    const schedule = await prisma.schedule.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { tournament: { select: { name: true, slug: true } } }
    });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.player1Name && !data.player1Avatar) {
      data.player1Avatar = await fetchPlayerAvatar(data.player1Name) || data.player1Avatar;
    }
    if (data.player2Name && !data.player2Avatar) {
      data.player2Avatar = await fetchPlayerAvatar(data.player2Name) || data.player2Avatar;
    }
    const newSchedule = await prisma.schedule.create({ data });
    res.json(newSchedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Only fetch avatar if name changed or avatar is missing
    const existing = await prisma.schedule.findUnique({ where: { id: parseInt(req.params.id) } });
    if (data.player1Name && (!data.player1Avatar || data.player1Name !== existing.player1Name)) {
      data.player1Avatar = await fetchPlayerAvatar(data.player1Name) || data.player1Avatar;
    }
    if (data.player2Name && (!data.player2Avatar || data.player2Name !== existing.player2Name)) {
      data.player2Avatar = await fetchPlayerAvatar(data.player2Name) || data.player2Avatar;
    }

    const updated = await prisma.schedule.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    await prisma.schedule.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request Reschedule
router.post('/:id/reschedule', requireAuth, async (req, res) => {
  const { rescheduleTime } = req.body;
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    
    // Verify requester is part of the match
    if (req.user.username !== schedule.player1Name && req.user.username !== schedule.player2Name) {
      return res.status(403).json({ error: 'You are not part of this match' });
    }

    const updated = await prisma.schedule.update({
      where: { id: parseInt(req.params.id) },
      data: {
        rescheduleTime: new Date(rescheduleTime),
        rescheduleBy: req.user.username,
        rescheduleStatus: 'pending'
      },
      include: { tournament: true }
    });
    
    // Notify opponent
    const opponent = req.user.username === updated.player1Name ? updated.player2Name : updated.player1Name;
    await sendNotification(opponent, `${req.user.username} requested to reschedule your match to ${new Date(rescheduleTime).toLocaleString()}`, `/tournament/${updated.tournament.slug}/schedule`);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept Reschedule
router.post('/:id/reschedule/accept', requireAuth, async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    
    // Verify acceptor is the OTHER player
    const expectedAcceptor = schedule.rescheduleBy === schedule.player1Name ? schedule.player2Name : schedule.player1Name;
    if (req.user.username !== expectedAcceptor && req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      return res.status(403).json({ error: 'Only the opposing player or Staff can accept' });
    }

    const updated = await prisma.schedule.update({
      where: { id: parseInt(req.params.id) },
      data: {
        matchTime: schedule.rescheduleTime,
        rescheduleTime: null,
        rescheduleBy: null,
        rescheduleStatus: null
      },
      include: { tournament: true }
    });
    
    // Notify requester and staff
    const msg = `${req.user.username} accepted the reschedule request. Match is now set to ${new Date(schedule.rescheduleTime).toLocaleString()}`;
    const link = `/tournament/${updated.tournament.slug}/schedule`;
    await sendNotification(schedule.rescheduleBy, msg, link);
    await notifyMatchStaff(updated, `Match reschedule accepted: ${updated.player1Name} vs ${updated.player2Name} to ${new Date(schedule.rescheduleTime).toLocaleString()}`, link);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject/Cancel Reschedule
router.post('/:id/reschedule/reject', requireAuth, async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    
    // Verify requester is part of the match or Staff
    if (req.user.username !== schedule.player1Name && req.user.username !== schedule.player2Name && req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.schedule.update({
      where: { id: parseInt(req.params.id) },
      data: {
        rescheduleTime: null,
        rescheduleBy: null,
        rescheduleStatus: null
      },
      include: { tournament: true }
    });
    
    // Notify requester
    if (schedule.rescheduleBy && req.user.username !== schedule.rescheduleBy) {
      await sendNotification(schedule.rescheduleBy, `${req.user.username} rejected the reschedule request.`, `/tournament/${updated.tournament.slug}/schedule`);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim Streamer/Commentator
router.post('/:id/claim', requireAuth, async (req, res) => {
  const { type, action } = req.body; // type: 'streamer' | 'commentator', action: 'claim' | 'unclaim'
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    // Verify user has the required staff role for this tournament
    const staffRec = await prisma.tournamentStaff.findFirst({
      where: { userId: req.user.id, tournamentId: schedule.tournamentId }
    });
    
    if (req.user.role !== 'ADMIN' && (!staffRec || (type === 'streamer' && staffRec.staffRole !== 'Streamer') && (type === 'commentator' && staffRec.staffRole !== 'Commentator'))) {
      return res.status(403).json({ error: `You do not have the ${type} role for this tournament` });
    }

    let updates = {};
    const username = req.user.username;

    if (type === 'streamer') {
      updates.streamer = action === 'claim' ? username : (schedule.streamer === username ? null : schedule.streamer);
    } else if (type === 'commentator') {
      let casters = schedule.commentators ? schedule.commentators.split(',').map(c => c.trim()).filter(Boolean) : [];
      if (action === 'claim' && !casters.includes(username)) {
        casters.push(username);
      } else if (action === 'unclaim') {
        casters = casters.filter(c => c !== username);
      }
      updates.commentators = casters.length > 0 ? casters.join(', ') : null;
    }

    const updated = await prisma.schedule.update({
      where: { id: parseInt(req.params.id) },
      data: updates
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
