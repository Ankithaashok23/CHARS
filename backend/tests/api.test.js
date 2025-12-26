const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;
let mongod;

beforeAll(async () => {
  let uri;
  try {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  } catch (err) {
    // Fallback to existing MONGODB_URI (e.g., docker-compose mongo)
    console.warn('mongodb-memory-server failed to start, falling back to MONGODB_URI');
    uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chars_test';
  }
  process.env.MONGODB_URI = uri;
  // require server (registers models)
  app = require('../server');
  // connect mongoose
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // clear DB to ensure clean state for tests
  const Complaint = mongoose.model('Complaint');
  const Notification = mongoose.model('Notification');
  const Action = mongoose.model('Action');
  const User = mongoose.model('User');
  try{
    await Promise.all([Complaint.deleteMany({}), Notification.deleteMany({}), Action.deleteMany({}), User.deleteMany({})]);
  }catch(e){ /* ignore if collections do not exist yet */ }
  // seed minimal users for tests
  await User.create({ username: 'admin', password: 'admin', role: 'admin', name: 'Admin' });
  await User.create({ username: 'tech-a', password: 'password', role: 'technician', name: 'Tech A' });
  await User.create({ username: 'student1', password: 'student', role: 'student', name: 'Student One' });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod && typeof mongod.stop === 'function') await mongod.stop();
});

describe('API flows', () => {
  let aliceId, bobId;

  test('create private complaint (Alice) and visibility', async () => {
    const res = await request(app).post('/api/complaints').send({ user: 'Alice', studentType: 'Day', category: 'Library', severity: 'Low', visibility: 'private', description: 'Library lights not working' });
    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('private');
    aliceId = res.body._id;
  });

  test('anonymous list excludes private complaints', async () => {
    const res = await request(app).get('/api/complaints');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('user sees their private complaint', async () => {
    const res = await request(app).get(`/api/complaints?user=Alice`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(aliceId);
  });

  test('create public complaint (Bob) and notify admin', async () => {
    const res = await request(app).post('/api/complaints').send({ user: 'Bob', studentType: 'Hostel', category: 'Food', severity: 'High', visibility: 'public', description: 'Food quality issue' });
    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('public');
    bobId = res.body._id;

    const notes = await request(app).get('/api/notifications?role=admin');
    expect(notes.status).toBe(200);
    expect(Array.isArray(notes.body)).toBe(true);
    // there should be at least one notification for Bob
    expect(notes.body.find(n => n.complaintId === bobId)).toBeDefined();
  });

  test('admin assigns complaint to technician and technician notified', async () => {
    // assign to seeded technician 'tech-a'
    const assign = await request(app).post(`/api/complaints/${bobId}/assign`).send({ technician: 'tech-a' });
    expect(assign.status).toBe(200);
    expect(assign.body.assignedTo).toBe('tech-a');

    const techNotes = await request(app).get('/api/notifications?role=technician&name=tech-a');
    expect(techNotes.status).toBe(200);
    expect(techNotes.body.find(n => n.complaintId === bobId)).toBeDefined();
  });

  test('technician marks assigned complaint as resolved and notifies student/admin', async () => {
    const res = await request(app).post(`/api/complaints/${bobId}/markResolved`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Resolved');

    const adminNotes = await request(app).get('/api/notifications?role=admin');
    expect(adminNotes.status).toBe(200);
    expect(adminNotes.body.find(n => n.type === 'resolved' && n.complaintId === bobId)).toBeDefined();

    const studentNotes = await request(app).get('/api/notifications?role=student&name=Bob');
    expect(studentNotes.status).toBe(200);
    expect(studentNotes.body.find(n => n.type === 'resolved_student' && n.complaintId === bobId)).toBeDefined();
  });
});
