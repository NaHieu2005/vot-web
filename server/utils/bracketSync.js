const prisma = require('../db');
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

async function syncBracketToSchedule(tournamentId) {
  // Find all bracket nodes for this tournament
  const nodes = await prisma.bracketNode.findMany({
    where: { tournamentId },
    include: { tournament: true }
  });

  let createdCount = 0;
  const size = nodes.length > 15 ? 16 : 8;

  const getRoundName = (roundNum, type) => {
    const r = parseInt(roundNum);
    if (type === 'Grand Final') return 'Grand Final';
    if (type === 'Winners') {
      if (size === 16) {
        if (r === 1) return 'Round of 16';
        if (r === 2) return 'Quarterfinals';
        if (r === 3) return 'Semifinals';
        if (r === 4) return 'Finals';
      } else {
        if (r === 1) return 'Quarterfinals';
        if (r === 2) return 'Semifinals';
        if (r === 3) return 'Finals';
      }
    } else if (type === 'Losers') {
      if (size === 16) {
        if (r === 1) return 'Quarterfinals';
        if (r === 2 || r === 3) return 'Semifinals';
        if (r === 4 || r === 5) return 'Finals';
        if (r === 6) return 'Grand Final';
      } else {
        if (r === 1) return 'Semifinals';
        if (r === 2 || r === 3) return 'Finals';
        if (r === 4) return 'Grand Final';
      }
    }
    return `${type} Round ${r}`;
  };

  for (const node of nodes) {
    // If it has both players and doesn't have a schedule yet
    if (node.player1 && node.player2 && !node.scheduleId) {
      const p1Avatar = await fetchPlayerAvatar(node.player1);
      const p2Avatar = await fetchPlayerAvatar(node.player2);

      // Create schedule match
      const newMatch = await prisma.schedule.create({
        data: {
          tournamentId,
          stage: getRoundName(node.round, node.bracketType),
          date: 'TBD', // To be decided
          status: 'upcoming',
          player1Name: node.player1,
          player2Name: node.player2,
          player1Avatar: p1Avatar,
          player2Avatar: p2Avatar,
          matchIdentifier: node.matchIdentifier
        }
      });

      // Link schedule to bracket node
      await prisma.bracketNode.update({
        where: { id: node.id },
        data: { scheduleId: newMatch.id }
      });

      createdCount++;
    }
  }

  return createdCount;
}

module.exports = { syncBracketToSchedule };
