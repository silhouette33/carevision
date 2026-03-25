const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 보호자 알림 목록
const getNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    include: {
      patient: { select: { name: true } },
    },
    orderBy: { sentAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
};

// 알림 읽음 처리
const markAsRead = async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (!notification)
    return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });

  await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { isRead: true },
  });
  res.json({ message: '읽음 처리 완료' });
};

// 전체 읽음 처리
const markAllAsRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: '전체 읽음 처리 완료' });
};

// 읽지 않은 알림 개수
const getUnreadCount = async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.userId, isRead: false },
  });
  res.json({ count });
};

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
