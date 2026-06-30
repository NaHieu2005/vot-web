const express = require('express');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const axios = require('axios');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Configure passport-oauth2 strategy (same approach as GTS website)
passport.use(
  'osu',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://osu.ppy.sh/oauth/authorize',
      tokenURL: 'https://osu.ppy.sh/oauth/token',
      clientID: process.env.OSU_CLIENT_ID,
      clientSecret: process.env.OSU_CLIENT_SECRET,
      callbackURL: process.env.OSU_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user info from osu! API v2
        const userRes = await axios.get('https://osu.ppy.sh/api/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const osuUser = userRes.data;

        // Check if user exists in DB
        let user = await prisma.user.findUnique({
          where: { osuId: osuUser.id },
        });

        if (!user) {
          // First user gets ADMIN role
          const count = await prisma.user.count();
          const role = count === 0 ? 'ADMIN' : 'PLAYER';

          user = await prisma.user.create({
            data: {
              osuId: osuUser.id,
              username: osuUser.username,
              avatarUrl: osuUser.avatar_url,
              role: role,
            },
          });
        } else {
          // Update username/avatar if changed
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              username: osuUser.username,
              avatarUrl: osuUser.avatar_url,
            },
          });
        }

        done(null, user);
      } catch (error) {
        console.error('OAuth strategy error:', error.message);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// 1. Redirect to osu! auth
router.get('/osu', passport.authenticate('osu'));

// 2. Handle callback from osu!
router.get(
  '/osu/callback',
  passport.authenticate('osu', { failureRedirect: FRONTEND_URL }),
  (req, res) => {
    // Create JWT from the user that passport has put on req.user
    const user = req.user;
    const jwtToken = jwt.sign(
      {
        id: user.id,
        osuId: user.osuId,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(FRONTEND_URL);
  }
);

// Middleware to check auth via JWT
const requireAuth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!dbUser) return res.status(401).json({ error: 'User not found' });
    
    req.user = { ...decoded, role: dbUser.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (dbUser) {
      req.user = { ...decoded, role: dbUser.role };
    }
    next();
  } catch (err) {
    next(); // Ignore invalid tokens
  }
};

router.get('/me', requireAuth, async (req, res) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });
    res.json(dbUser);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
