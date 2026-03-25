const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPatients = async (req, res) => {
  const patients = await prisma.patient.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(patients);
};

const getPatient = async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (!patient)
    return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });
  res.json(patient);
};

const createPatient = async (req, res) => {
  const { name, age, address, phone } = req.body;
  if (!name)
    return res.status(400).json({ message: '이름을 입력하세요.' });

  const patient = await prisma.patient.create({
    data: { name, age, address, phone, userId: req.userId },
  });
  res.status(201).json(patient);
};

const updatePatient = async (req, res) => {
  const { name, age, address, phone } = req.body;
  const patient = await prisma.patient.updateMany({
    where: { id: Number(req.params.id), userId: req.userId },
    data: { name, age, address, phone },
  });
  if (patient.count === 0)
    return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });
  res.json({ message: '수정 완료' });
};

const deletePatient = async (req, res) => {
  await prisma.patient.deleteMany({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  res.json({ message: '삭제 완료' });
};

module.exports = { getPatients, getPatient, createPatient, updatePatient, deletePatient };
