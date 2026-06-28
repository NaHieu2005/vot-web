const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// Get notifications for logged in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { targetUser: req.user.username },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!notif || notif.targetUser !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { targetUser: req.user.username, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
