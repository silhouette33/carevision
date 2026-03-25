const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 복약 스케줄 목록
const getMedications = async (req, res) => {
  const { patientId } = req.params;
  const patient = await prisma.patient.findFirst({
    where: { id: Number(patientId), userId: req.userId },
  });
  if (!patient)
    return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });

  const medications = await prisma.medication.findMany({
    where: { patientId: Number(patientId), isActive: true },
    orderBy: { scheduleTime: 'asc' },
  });
  res.json(medications);
};

// 복약 스케줄 등록
const createMedication = async (req, res) => {
  const { patientId, name, dosage, scheduleTime, days } = req.body;
  if (!patientId || !name || !scheduleTime || !days)
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });

  const patient = await prisma.patient.findFirst({
    where: { id: Number(patientId), userId: req.userId },
  });
  if (!patient)
    return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });

  const medication = await prisma.medication.create({
    data: { patientId: Number(patientId), name, dosage, scheduleTime, days },
  });
  res.status(201).json(medication);
};

// 복약 스케줄 수정
const updateMedication = async (req, res) => {
  const { name, dosage, scheduleTime, days, isActive } = req.body;
  const med = await prisma.medication.findFirst({
    where: { id: Number(req.params.id) },
    include: { patient: true },
  });
  if (!med || med.patient.userId !== req.userId)
    return res.status(404).json({ message: '복약 스케줄을 찾을 수 없습니다.' });

  const updated = await prisma.medication.update({
    where: { id: Number(req.params.id) },
    data: { name, dosage, scheduleTime, days, isActive },
  });
  res.json(updated);
};

// 복약 스케줄 삭제 (비활성화)
const deleteMedication = async (req, res) => {
  const med = await prisma.medication.findFirst({
    where: { id: Number(req.params.id) },
    include: { patient: true },
  });
  if (!med || med.patient.userId !== req.userId)
    return res.status(404).json({ message: '복약 스케줄을 찾을 수 없습니다.' });

  await prisma.medication.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false },
  });
  res.json({ message: '삭제 완료' });
};

// 복약 기록 (오늘 날짜 기준 O/X 현황)
const getMedicationLogs = async (req, res) => {
  const { patientId } = req.params;
  const { date } = req.query; // YYYY-MM-DD 형식, 없으면 오늘

  const patient = await prisma.patient.findFirst({
    where: { id: Number(patientId), userId: req.userId },
  });
  if (!patient)
    return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });

  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  const logs = await prisma.medicationLog.findMany({
    where: {
      patientId: Number(patientId),
      createdAt: { gte: start, lte: end },
    },
    include: { medication: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(logs);
};

// 복약 기록 저장 (AI 서버에서 호출)
const createMedicationLog = async (req, res) => {
  const { patientId, medicationId, status } = req.body;
  if (!patientId || !medicationId || !status)
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });

  const log = await prisma.medicationLog.create({
    data: {
      patientId: Number(patientId),
      medicationId: Number(medicationId),
      status,
      takenAt: status === 'TAKEN' ? new Date() : null,
    },
  });
  res.status(201).json(log);
};

module.exports = {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getMedicationLogs,
  createMedicationLog,
};
