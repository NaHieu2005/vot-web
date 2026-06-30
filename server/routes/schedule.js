const express = require('express');
const prisma = require('../db');
const { requireAuth, optionalAuth } = require('./auth');
const { syncBracketToSchedule } = require('../utils/bracketSync');
const { processMpLink } = require('../utils/osuStats');

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

router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = {};
    if (req.query.tournamentId) where.tournamentId = parseInt(req.query.tournamentId);
    
    let canSeeAll = false;
    if (req.user && req.user.role === 'ADMIN') {
      canSeeAll = true;
    } else if (req.user && req.query.tournamentId) {
      const staffRecord = await prisma.tournamentStaff.findFirst({
        where: {
          userId: req.user.id,
          tournamentId: parseInt(req.query.tournamentId),
          staffRole: 'Host'
        }
      });
      if (staffRecord) canSeeAll = true;
    }

    const configs = await prisma.stageConfig.findMany({ where });
    const publishedStages = configs.filter(c => c.schedulePublished).map(c => c.stage);

    const schedules = await prisma.schedule.findMany({
      where: {
        ...where,
        ...(canSeeAll ? {} : { stage: { in: publishedStages } })
      },
      include: {
        lobbyPlayers: {
          include: { user: { select: { username: true, avatarUrl: true } } }
        }
      },
      orderBy: [
        { status: 'asc' },
        { id: 'asc' }
      ]
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin/Staff: Recalculate stats for all matches with MP Links
router.post('/recalculate-all', requireAuth, requireStaff, async (req, res) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

    const schedules = await prisma.schedule.findMany({
      where: { 
        tournamentId: parseInt(tournamentId),
        mpLink: { not: null }
      }
    });

    for (const schedule of schedules) {
      if (schedule.mpLink) {
        await processMpLink(schedule.id, schedule.mpLink);
      }
    }

    res.json({ success: true, count: schedules.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const { tournamentId, stage, player1Name, player2Name, date, matchIdentifier, matchTime, refereeName, streamer, commentators } = req.body;
    if (!tournamentId || !stage) return res.status(400).json({ error: 'tournamentId and stage required' });

    const isQualifier = stage.toLowerCase().includes('qualifier');

    let p1Avatar = null;
    let p2Avatar = null;
    
    if (!isQualifier && player1Name) p1Avatar = await fetchPlayerAvatar(player1Name);
    if (!isQualifier && player2Name) p2Avatar = await fetchPlayerAvatar(player2Name);

    const match = await prisma.schedule.create({
      data: {
        tournamentId: parseInt(tournamentId),
        stage,
        type: isQualifier ? 'qualifier' : 'match',
        matchIdentifier: matchIdentifier || null,
        player1Name: isQualifier ? null : player1Name,
        player2Name: isQualifier ? null : player2Name,
        player1Avatar: p1Avatar,
        player2Avatar: p2Avatar,
        date: date || 'TBD',
        matchTime: matchTime || null,
        status: req.body.status || 'upcoming',
        refereeName: refereeName || null,
        streamer: streamer || null,
        commentators: commentators || null
      }
    });

    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.matchTime === '') data.matchTime = null;
    if (data.stage && data.stage.toLowerCase().includes('qualifier')) data.type = 'qualifier';
    
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
    if (req.user.username !== schedule.player1Name && req.user.username !== schedule.player2Name && req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      return res.status(403).json({ error: 'You do not have permission to reschedule this match' });
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
    
    if (req.user.role !== 'ADMIN' && (!staffRec || (type === 'streamer' && staffRec.staffRole !== 'Streamer') && (type === 'commentator' && staffRec.staffRole !== 'Commentator') && (type === 'referee' && staffRec.staffRole !== 'Referee'))) {
      return res.status(403).json({ error: `You do not have the ${type} role for this tournament` });
    }

    let updates = {};
    const username = req.user.username;

    if (type === 'streamer') {
      updates.streamer = action === 'claim' ? username : (schedule.streamer === username ? null : schedule.streamer);
    } else if (type === 'referee') {
      updates.refereeName = action === 'claim' ? username : (schedule.refereeName === username ? null : schedule.refereeName);
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

// Submit Match Result
router.post('/:id/result', requireAuth, async (req, res) => {
  const { score1, score2, mpLink } = req.body;
  const matchId = parseInt(req.params.id);
  const s1 = parseInt(score1);
  const s2 = parseInt(score2);

  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: matchId }, include: { tournament: true } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    // Verify user is the assigned referee or an ADMIN/STAFF
    if (req.user.role !== 'ADMIN' && req.user.username !== schedule.refereeName) {
      return res.status(403).json({ error: 'Only the assigned Referee or Admin can submit results' });
    }

    const updated = await prisma.schedule.update({
      where: { id: matchId },
      data: { score1: s1, score2: s2, mpLink: mpLink || null, status: 'completed' }
    });

    // Process MP Link in background
    if (mpLink) {
      processMpLink(matchId, mpLink).catch(err => console.error("Error processing MP link:", err));
    }

    // Check if this schedule is part of a Bracket
    const bNode = await prisma.bracketNode.findUnique({ where: { scheduleId: matchId } });
    if (bNode) {
      // Update the BracketNode
      await prisma.bracketNode.update({
        where: { id: bNode.id },
        data: { score1: s1, score2: s2, isCompleted: true }
      });

      // Determine Winner and Loser
      if (s1 !== s2) {
        const newWinner = s1 > s2 ? schedule.player1Name : schedule.player2Name;
        const newLoser = s1 > s2 ? schedule.player2Name : schedule.player1Name;

        let oldWinner = null;
        let oldLoser = null;
        if (schedule.status === 'completed' && schedule.score1 !== null && schedule.score2 !== null && schedule.score1 !== schedule.score2) {
          oldWinner = schedule.score1 > schedule.score2 ? schedule.player1Name : schedule.player2Name;
          oldLoser = schedule.score1 > schedule.score2 ? schedule.player2Name : schedule.player1Name;
        }

        const updateNextMatch = async (nextId, oldPlayer, newPlayer) => {
          if (!nextId || oldPlayer === newPlayer) return;
          const nextNode = await prisma.bracketNode.findUnique({ where: { id: nextId } });
          if (!nextNode) return;

          let updateData = {};
          let targetSlot = null;
          
          if (oldPlayer && nextNode.player1 === oldPlayer) targetSlot = 'player1';
          else if (oldPlayer && nextNode.player2 === oldPlayer) targetSlot = 'player2';
          else if (!nextNode.player1) targetSlot = 'player1';
          else targetSlot = 'player2';

          updateData[targetSlot] = newPlayer;
          await prisma.bracketNode.update({ where: { id: nextNode.id }, data: updateData });

          // Sync Schedule if it exists
          if (nextNode.scheduleId) {
            const schedUpdate = {};
            schedUpdate[targetSlot === 'player1' ? 'player1Name' : 'player2Name'] = newPlayer;
            
            try {
              const { fetchPlayerAvatar } = require('../utils/bracketSync');
              const avatar = await fetchPlayerAvatar(newPlayer);
              if (avatar) schedUpdate[targetSlot === 'player1' ? 'player1Avatar' : 'player2Avatar'] = avatar;
            } catch (e) {}

            await prisma.schedule.update({ where: { id: nextNode.scheduleId }, data: schedUpdate });
          }
        };

        await updateNextMatch(bNode.nextWinnerMatchId, oldWinner, newWinner);
        await updateNextMatch(bNode.nextLoserMatchId, oldLoser, newLoser);
      }
    }

    // Call sync to auto-generate any newly filled matches
    await syncBracketToSchedule(schedule.tournamentId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Player: Join Qualifier Lobby
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const userId = req.user.id;

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    if (!schedule || schedule.type !== 'qualifier') return res.status(400).json({ error: 'Invalid qualifier lobby' });

    // Check if player is registered for this tournament
    const isRegistered = await prisma.tournamentPlayer.findUnique({
      where: { userId_tournamentId: { userId, tournamentId: schedule.tournamentId } }
    });
    if (!isRegistered) return res.status(403).json({ error: 'You are not registered for this tournament' });

    // Check if player already joined ANY qualifier lobby for this tournament
    const existingLobbies = await prisma.lobbyPlayer.findFirst({
      where: {
        userId,
        schedule: { tournamentId: schedule.tournamentId, type: 'qualifier' }
      }
    });
    if (existingLobbies) return res.status(400).json({ error: 'You have already joined a Qualifier Lobby. Please leave it first.' });

    const lp = await prisma.lobbyPlayer.create({
      data: { scheduleId, userId }
    });
    res.json(lp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin/Staff: Manually Join Qualifier Lobby
router.post('/:id/join-manual', requireAuth, requireStaff, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const { username } = req.body;

    if (!username) return res.status(400).json({ error: 'Username is required' });

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    if (!schedule || schedule.type !== 'qualifier') return res.status(400).json({ error: 'Invalid qualifier lobby' });

    const targetUser = await prisma.user.findFirst({
      where: { username }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found in database. Have they logged in?' });

    const isRegistered = await prisma.tournamentPlayer.findUnique({
      where: { userId_tournamentId: { userId: targetUser.id, tournamentId: schedule.tournamentId } }
    });
    if (!isRegistered) return res.status(403).json({ error: 'Player is not registered for this tournament' });

    // Allow Admin/Staff to add players to multiple qualifier lobbies (e.g. for multiple plays)
    // We only prevent them from adding the player to the EXACT SAME lobby twice
    const alreadyInThisLobby = await prisma.lobbyPlayer.findUnique({
      where: {
        scheduleId_userId: { scheduleId, userId: targetUser.id }
      }
    });
    if (alreadyInThisLobby) return res.status(400).json({ error: 'Player is already in this specific Lobby.' });

    const lp = await prisma.lobbyPlayer.create({
      data: { scheduleId, userId: targetUser.id }
    });
    res.json(lp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Player: Leave Qualifier Lobby
router.delete('/:id/leave', requireAuth, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const userId = req.user.id;

    await prisma.lobbyPlayer.delete({
      where: { scheduleId_userId: { scheduleId, userId } }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin/Staff: Manually Leave Qualifier Lobby
router.delete('/:id/leave-manual/:userId', requireAuth, requireStaff, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    await prisma.lobbyPlayer.delete({
      where: { scheduleId_userId: { scheduleId, userId } }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
