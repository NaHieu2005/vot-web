require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournament');
const mappoolRoutes = require('./routes/mappool');
const scheduleRoutes = require('./routes/schedule');
const statsRoutes = require('./routes/stats');
const staffRoutes = require('./routes/staff');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/mappool', mappoolRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/staff', staffRoutes);

// Seed VOT6 on first run
const prisma = require('./db');
async function seedIfEmpty() {
  const count = await prisma.tournament.count();
  if (count === 0) {
    await prisma.tournament.create({
      data: {
        name: 'Vietnam osu!taiko Tournament 6',
        slug: 'vot6',
        shortName: 'VOT6',
        description: 'The premier national osu!taiko tournament for Vietnamese players. Season 6 brings fiercer competition than ever.',
        status: 'ongoing',
        accentColor: '#d92332',
        startDate: '2026-07-01',
        endDate: '2026-08-31',
      }
    });
    console.log('Seeded VOT6 tournament');
  }
}

const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedIfEmpty();
});
