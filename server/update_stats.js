require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

let cachedOsuToken = null;
let tokenExpiresAt = 0;

async function getOsuToken() {
  if (cachedOsuToken && Date.now() < tokenExpiresAt) return cachedOsuToken;
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
    } catch (e) {}
  }

  const m = modString.toUpperCase();
  if (m.includes('HR')) {
    hp = Math.min(10, hp * 1.4);
    od = Math.min(10, od * 1.4);
  } else if (m.includes('EZ')) {
    hp = hp * 0.5;
    od = od * 0.5;
  }

  if (m.includes('DT')) {
    bpm = bpm * 1.5;
    length = Math.floor(length / 1.5);
    od = (16.66666 + 2 * od) / 3;
  } else if (m.includes('HT')) {
    bpm = bpm * 0.75;
    length = Math.floor(length / 0.75);
    od = (4 * od - 16.66666) / 3;
  }

  hp = Math.round(hp * 10) / 10;
  od = Math.round(od * 10) / 10;
  return { sr, hp, od, bpm, length };
}

async function updateAllMaps() {
  const maps = await prisma.mappool.findMany();
  console.log(`Found ${maps.length} maps. Updating...`);
  
  for (const map of maps) {
    try {
      const token = await getOsuToken();
      const mapRes = await axios.get(`https://osu.ppy.sh/api/v2/beatmaps/${map.beatmapId}`, {
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
      
      const modded = await getModdedStats(map.beatmapId, map.mod, baseStats);
      
      await prisma.mappool.update({
        where: { id: map.id },
        data: {
          sr: modded.sr,
          hp: modded.hp,
          od: modded.od,
          bpm: modded.bpm,
          length: modded.length
        }
      });
      console.log(`Updated [${map.mod}] ${map.title}`);
    } catch (e) {
      console.error(`Error updating map ${map.id}:`, e.message);
    }
  }
  console.log('All maps updated!');
}

updateAllMaps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
