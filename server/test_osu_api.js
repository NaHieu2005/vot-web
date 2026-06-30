const axios = require('axios');

async function testApi() {
  const payload = {
    client_id: parseInt(process.env.OSU_CLIENT_ID || 0, 10),
    client_secret: process.env.OSU_CLIENT_SECRET || '',
    grant_type: 'client_credentials',
    scope: 'public'
  };
  
  if (!payload.client_id) {
    console.log("No env");
    return;
  }
  
  const tokenRes = await axios.post('https://osu.ppy.sh/oauth/token', payload, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  });
  const token = tokenRes.data.access_token;

  // Let's get a taiko map ID, e.g., 2000000 or some well known map. We can just use the attributes endpoint.
  // We'll use 741477 (a taiko map)
  
  const attrRes = await axios.post(`https://osu.ppy.sh/api/v2/beatmaps/741477/attributes`, {
    mods: 16, // HR
    ruleset: 'taiko'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(JSON.stringify(attrRes.data, null, 2));
}

testApi();
