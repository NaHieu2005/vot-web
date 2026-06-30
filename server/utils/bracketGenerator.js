const generateBracket8 = (tournamentId, round1Matchups, roundBestOfs) => {
  // round1Matchups is an array of 4 objects: { p1, p2 }
  const matches = {};
  let mId = 1;

  // Helpers
  const createMatch = (type, round, order, identifier) => {
    const m = {
      internalId: mId++, // Temporary ID before saving to DB
      tournamentId,
      bracketType: type,
      round,
      matchOrder: order,
      matchIdentifier: identifier,
      player1: null,
      player2: null,
      bestOf: type === 'Grand Final' ? roundBestOfs.GF : (type === 'Winners' ? roundBestOfs.W[round - 1] : roundBestOfs.L[round - 1]),
      nextWinnerMatchId: null,
      nextLoserMatchId: null,
      score1: null,
      score2: null,
      isCompleted: false
    };
    matches[identifier] = m;
    return m;
  };

  // Winners Bracket (7 matches)
  createMatch('Winners', 1, 1, 'W1');
  createMatch('Winners', 1, 2, 'W2');
  createMatch('Winners', 1, 3, 'W3');
  createMatch('Winners', 1, 4, 'W4');
  createMatch('Winners', 2, 1, 'W5');
  createMatch('Winners', 2, 2, 'W6');
  createMatch('Winners', 3, 1, 'W7');

  // Losers Bracket (6 matches)
  createMatch('Losers', 1, 1, 'L1');
  createMatch('Losers', 1, 2, 'L2');
  createMatch('Losers', 2, 1, 'L3');
  createMatch('Losers', 2, 2, 'L4');
  createMatch('Losers', 3, 1, 'L5');
  createMatch('Losers', 4, 1, 'L6');

  // Grand Final (1 match)
  createMatch('Grand Final', 1, 1, 'GF1');
  // Bracket Reset is GF2, but usually created on the fly if needed

  // --- Populate Initial Data ---
  matches['W1'].player1 = round1Matchups[0].p1; matches['W1'].player2 = round1Matchups[0].p2;
  matches['W2'].player1 = round1Matchups[1].p1; matches['W2'].player2 = round1Matchups[1].p2;
  matches['W3'].player1 = round1Matchups[2].p1; matches['W3'].player2 = round1Matchups[2].p2;
  matches['W4'].player1 = round1Matchups[3].p1; matches['W4'].player2 = round1Matchups[3].p2;

  // --- Routing Logic ---
  // W1 winner -> W5, loser -> L1
  matches['W1'].nextWinnerMatchId = 'W5'; matches['W1'].nextLoserMatchId = 'L1';
  matches['W2'].nextWinnerMatchId = 'W5'; matches['W2'].nextLoserMatchId = 'L1';
  matches['W3'].nextWinnerMatchId = 'W6'; matches['W3'].nextLoserMatchId = 'L2';
  matches['W4'].nextWinnerMatchId = 'W6'; matches['W4'].nextLoserMatchId = 'L2';

  // W5 winner -> W7, loser -> L4 (cross)
  matches['W5'].nextWinnerMatchId = 'W7'; matches['W5'].nextLoserMatchId = 'L4';
  matches['W6'].nextWinnerMatchId = 'W7'; matches['W6'].nextLoserMatchId = 'L3'; // cross

  // W7 winner -> GF1, loser -> L6
  matches['W7'].nextWinnerMatchId = 'GF1'; matches['W7'].nextLoserMatchId = 'L6';

  // L1 winner -> L3
  matches['L1'].nextWinnerMatchId = 'L3';
  matches['L2'].nextWinnerMatchId = 'L4';

  // L3 winner -> L5
  matches['L3'].nextWinnerMatchId = 'L5';
  matches['L4'].nextWinnerMatchId = 'L5';

  // L5 winner -> L6
  matches['L5'].nextWinnerMatchId = 'L6';

  // L6 winner -> GF1
  matches['L6'].nextWinnerMatchId = 'GF1';

  return matches; // Return object graph, DB will replace string refs with actual IDs
};

const generateBracket16 = (tournamentId, round1Matchups, roundBestOfs) => {
  // 8 matches in round 1
  const matches = {};
  let mId = 1;
  const createMatch = (type, round, order, identifier) => {
    const m = { internalId: mId++, tournamentId, bracketType: type, round, matchOrder: order, matchIdentifier: identifier, player1: null, player2: null, bestOf: type === 'Grand Final' ? roundBestOfs.GF : (type === 'Winners' ? roundBestOfs.W[round - 1] : roundBestOfs.L[round - 1]), nextWinnerMatchId: null, nextLoserMatchId: null, score1: null, score2: null, isCompleted: false };
    matches[identifier] = m; return m;
  };

  // Winners Bracket (15 matches)
  for(let i=1; i<=8; i++) createMatch('Winners', 1, i, 'W'+i);
  for(let i=9; i<=12; i++) createMatch('Winners', 2, i-8, 'W'+i);
  for(let i=13; i<=14; i++) createMatch('Winners', 3, i-12, 'W'+i);
  createMatch('Winners', 4, 1, 'W15');

  // Losers Bracket (14 matches)
  for(let i=1; i<=4; i++) createMatch('Losers', 1, i, 'L'+i);
  for(let i=5; i<=8; i++) createMatch('Losers', 2, i-4, 'L'+i);
  for(let i=9; i<=10; i++) createMatch('Losers', 3, i-8, 'L'+i);
  for(let i=11; i<=12; i++) createMatch('Losers', 4, i-10, 'L'+i);
  createMatch('Losers', 5, 1, 'L13');
  createMatch('Losers', 6, 1, 'L14');

  // Grand Final
  createMatch('Grand Final', 1, 1, 'GF1');

  // Populate Round 1
  for(let i=1; i<=8; i++) {
    matches['W'+i].player1 = round1Matchups[i-1].p1;
    matches['W'+i].player2 = round1Matchups[i-1].p2;
  }

  // Routing W1-W8
  matches['W1'].nextWinnerMatchId = 'W9'; matches['W1'].nextLoserMatchId = 'L1';
  matches['W2'].nextWinnerMatchId = 'W9'; matches['W2'].nextLoserMatchId = 'L1';
  matches['W3'].nextWinnerMatchId = 'W10'; matches['W3'].nextLoserMatchId = 'L2';
  matches['W4'].nextWinnerMatchId = 'W10'; matches['W4'].nextLoserMatchId = 'L2';
  matches['W5'].nextWinnerMatchId = 'W11'; matches['W5'].nextLoserMatchId = 'L3';
  matches['W6'].nextWinnerMatchId = 'W11'; matches['W6'].nextLoserMatchId = 'L3';
  matches['W7'].nextWinnerMatchId = 'W12'; matches['W7'].nextLoserMatchId = 'L4';
  matches['W8'].nextWinnerMatchId = 'W12'; matches['W8'].nextLoserMatchId = 'L4';

  // Routing W9-W12
  matches['W9'].nextWinnerMatchId = 'W13'; matches['W9'].nextLoserMatchId = 'L8';
  matches['W10'].nextWinnerMatchId = 'W13'; matches['W10'].nextLoserMatchId = 'L7';
  matches['W11'].nextWinnerMatchId = 'W14'; matches['W11'].nextLoserMatchId = 'L6';
  matches['W12'].nextWinnerMatchId = 'W14'; matches['W12'].nextLoserMatchId = 'L5';

  // Routing W13-W14
  matches['W13'].nextWinnerMatchId = 'W15'; matches['W13'].nextLoserMatchId = 'L12';
  matches['W14'].nextWinnerMatchId = 'W15'; matches['W14'].nextLoserMatchId = 'L11';

  // Routing W15
  matches['W15'].nextWinnerMatchId = 'GF1'; matches['W15'].nextLoserMatchId = 'L14';

  // Routing Losers
  matches['L1'].nextWinnerMatchId = 'L5';
  matches['L2'].nextWinnerMatchId = 'L6';
  matches['L3'].nextWinnerMatchId = 'L7';
  matches['L4'].nextWinnerMatchId = 'L8';

  matches['L5'].nextWinnerMatchId = 'L9';
  matches['L6'].nextWinnerMatchId = 'L9';
  matches['L7'].nextWinnerMatchId = 'L10';
  matches['L8'].nextWinnerMatchId = 'L10';

  matches['L9'].nextWinnerMatchId = 'L11';
  matches['L10'].nextWinnerMatchId = 'L12';

  matches['L11'].nextWinnerMatchId = 'L13';
  matches['L12'].nextWinnerMatchId = 'L13';

  matches['L13'].nextWinnerMatchId = 'L14';

  matches['L14'].nextWinnerMatchId = 'GF1';

  return matches;
};

module.exports = { generateBracket8, generateBracket16 };
