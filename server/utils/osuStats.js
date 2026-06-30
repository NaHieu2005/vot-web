const axios = require('axios');
const prisma = require('../db');

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

async function processMpLink(scheduleId, mpLink) {
  if (!mpLink) return;

  // Extract match ID
  // e.g. https://osu.ppy.sh/community/matches/111222333
  // or https://osu.ppy.sh/mp/111222333
  const matchMatch = mpLink.match(/\/(?:matches|mp)\/(\d+)/);
  if (!matchMatch) return;
  const matchId = matchMatch[1];

  try {
    const token = await getOsuToken();
    const res = await axios.get(`https://osu.ppy.sh/api/v2/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const matchData = res.data;
    if (!matchData || !matchData.events) return;

    // Fetch schedule and tournament mappool
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });
    if (!schedule) return;

    // Fetch Mappool for this stage
    const mappool = await prisma.mappool.findMany({
      where: { tournamentId: schedule.tournamentId, stage: schedule.stage }
    });
    if (mappool.length === 0) return; // No mappool defined for this stage

    // Create a map of valid beatmap IDs to their mappool pick info
    const poolMap = {};
    mappool.forEach(p => { poolMap[p.beatmapId] = p; });

    // Create mapping from matchData.users
    const osuIdToName = {};
    if (matchData.users) {
      matchData.users.forEach(u => {
        osuIdToName[u.id] = u.username;
      });
    }

    // Fetch registered players for this tournament
    const registeredPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId: schedule.tournamentId },
      include: { user: true }
    });

    const registeredOsuIds = new Set();
    const registeredUsernames = new Set();
    registeredPlayers.forEach(rp => {
      if (rp.user) {
        if (rp.user.osuId) registeredOsuIds.add(parseInt(rp.user.osuId, 10));
        if (rp.user.username) registeredUsernames.add(rp.user.username);
      }
    });

    // Iterate through game events
    const validGames = matchData.events.filter(e => e.detail.type === 'other' && e.game);

    for (const event of validGames) {
      const game = event.game;
      if (!poolMap[game.beatmap_id]) continue; // Beatmap is not in pool

      for (const score of game.scores) {
        // Ignore referees or aborted scores (score = 0 usually, but we can just track it)
        if (score.score === 0) continue;

        const osuUserId = score.user_id;
        const playerName = osuIdToName[osuUserId] || `User_${osuUserId}`;

        // Only record if player is registered in this tournament
        if (!registeredOsuIds.has(osuUserId) && !registeredUsernames.has(playerName)) {
          continue;
        }

        // Upsert MatchScore
        // To handle aborts/rematches, we update if a score exists for this schedule, beatmap, and player.
        // Actually, we should keep the highest score.
        const existing = await prisma.matchScore.findUnique({
          where: {
            scheduleId_beatmapId_playerName: {
              scheduleId: schedule.id,
              beatmapId: game.beatmap_id,
              playerName: playerName
            }
          }
        });

        if (!existing || existing.score < score.score) {
          await prisma.matchScore.upsert({
            where: {
              scheduleId_beatmapId_playerName: {
                scheduleId: schedule.id,
                beatmapId: game.beatmap_id,
                playerName: playerName
              }
            },
            update: {
              score: score.score,
              accuracy: score.accuracy * 100, // API returns 0.985
              count300: score.statistics.count_300 || 0,
              count100: score.statistics.count_100 || 0,
              count50: score.statistics.count_50 || 0,
              countMiss: score.statistics.count_miss || 0,
            },
            create: {
              tournamentId: schedule.tournamentId,
              stage: schedule.stage,
              scheduleId: schedule.id,
              beatmapId: game.beatmap_id,
              playerName: playerName,
              score: score.score,
              accuracy: score.accuracy * 100,
              count300: score.statistics.count_300 || 0,
              count100: score.statistics.count_100 || 0,
              count50: score.statistics.count_50 || 0,
              countMiss: score.statistics.count_miss || 0,
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('Failed to process MP Link:', error);
  }
}

module.exports = {
  processMpLink
};
