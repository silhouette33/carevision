const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const register = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ message: '모든 항목을 입력하세요.' });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  res.status(201).json({ message: '회원가입 완료', userId: user.id });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 틀렸습니다.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 틀렸습니다.' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
};

const updateFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  await prisma.user.update({
    where: { id: req.userId },
    data: { fcmToken },
  });
  res.json({ message: 'FCM 토큰 업데이트 완료' });
};

module.exports = { register, login, updateFcmToken };
