const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Serve the static frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve root to `login.html` because the frontend does not include an index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chars';

// Mongoose models
const complaintSchema = new mongoose.Schema({
  user: { type: String, default: 'Anonymous' },
  studentType: { type: String, default: 'Day' },
  category: { type: String, default: 'General' },
  description: { type: String, default: '' },
  severity: { type: String, enum: ['Low','Medium','High'], default: 'Low' },
  votes: { type: Number, default: 0 },
  status: { type: String, default: 'Submitted' },
  priorityScore: { type: Number, default: 0 },
  priority: { type: String, default: 'Low' },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  assignedTo: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Map severity string to numeric weight
const severityWeight = { 'Low': 1, 'Medium': 2, 'High': 3 };
function computePriority(doc) {
  const s = doc.severity || 'Low';
  const sv = severityWeight[s] || 1;
  // severity has higher impact: weight * 2 + votes
  doc.priorityScore = (sv * 2) + (doc.votes || 0);
  if (doc.priorityScore <= 3) doc.priority = 'Low';
  else if (doc.priorityScore <= 6) doc.priority = 'Medium';
  else doc.priority = 'High';
}

// We compute priority explicitly in handlers rather than a pre-save hook

const actionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true },
  recipientRole: { type: String, enum: ['admin','technician','student'], required: true },
  recipientName: { type: String },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
const Action = mongoose.model('Action', actionSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Basic user model for login/roles
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // plaintext for demo only
  role: { type: String, enum: ['student','admin','technician'], required: true },
  name: { type: String },
  contact: { type: String }
});
const User = mongoose.model('User', userSchema);

// Seed basic users if none exist
async function seedUsers(){
  const count = await User.countDocuments();
  if(count === 0){
    await User.create({ username: 'admin', password: 'admin', role: 'admin', name: 'Admin' });
    await User.create({ username: 'tech-a', password: 'password', role: 'technician', name: 'Tech A', contact: 'tech-a@college.edu' });
    await User.create({ username: 'tech-b', password: 'password', role: 'technician', name: 'Tech B', contact: 'tech-b@college.edu' });
    await User.create({ username: 'student1', password: 'student', role: 'student', name: 'Student One' });
    console.log('Seeded default users (admin, technicians, student).');
  }
}


// Validate the MongoDB URI for common mistakes (missing creds/placeholders)
function validateMongoUri(uri) {
  if (!uri) return { ok: false, message: 'MONGODB_URI is empty' };
  // check for common placeholder patterns
  if (/<password>|<username>|PASSWORD|USERNAME|REPLACE_ME/i.test(uri)) {
    return { ok: false, message: 'MONGODB_URI contains placeholder values like <password> or <username>. Replace them with real credentials.' };
  }
  // If URI uses auth, ensure it contains username:password@
  const hasAuth = /mongodb(?:\+srv)?:\/\/[^@]+@/.test(uri);
  if (uri.includes('mongodb') && uri.includes('mongodb+srv') === false && uri.includes('localhost')) {
    // local URIs are acceptable without auth
    return { ok: true };
  }
  if (uri.startsWith('mongodb') && uri.includes('@') && !/:[^:@]+@/.test(uri)) {
    return { ok: false, message: 'MONGODB_URI appears to include an auth user but no password. Use the format mongodb+srv://user:pass@...' };
  }
  return { ok: true };
}

async function connectToMongoAndStart() {
  const validation = validateMongoUri(MONGODB_URI);
  if (!validation.ok) {
    console.error('MongoDB URI validation failed:', validation.message);
    console.error('See README.md (MongoDB Atlas) for setup instructions.');
    process.exit(1);
  }

  try {
    // Try to connect with a short server selection timeout to fail fast on bad URIs
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message || err);
    console.error('If you are using Atlas, ensure you replaced <username> and <password> in the connection string and added your IP address to Network Access.');
    process.exit(1);
  }

  // seed users
  try { await seedUsers(); } catch (e) { console.warn('seeding users failed', e.message); }

  // Start the server after successful DB connection
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

// Start server when run directly (but export app for tests)
if (require.main === module) {
  connectToMongoAndStart();
}

module.exports = app;

app.post('/api/complaints', async (req, res) => {
  try {
    const { user, studentType, category, severity, visibility, description } = req.body;
    const c = new Complaint({ user, studentType, category, severity, visibility, description });
    computePriority(c);
    await c.save();

    // Notify admin about new complaint
    const short = (description || '').slice(0, 120);
    await Notification.create({ type: 'new_complaint', message: `New complaint by ${c.user}: ${c.category} - ${short}`, recipientRole: 'admin', complaintId: c._id });

    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/complaints', async (req, res) => {
  const { user, admin, assignedTo } = req.query;
  let filter = {};

  if (admin === 'true') {
    filter = {};
  } else if (user) {
    // show public complaints and the private complaints owned by the requesting user
    filter = { $or: [ { visibility: 'public' }, { user } ] };
  } else {
    // anonymous listing: only public
    filter = { visibility: 'public' };
  }

  if (assignedTo) filter.assignedTo = assignedTo;

  const list = await Complaint.find(filter).sort({ priorityScore: -1, createdAt: -1 });
  res.json(list);
});

app.get('/api/complaints/:id', async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).send('Not found');
  res.json(c);
});

// Simple login endpoint (demo only - plaintext passwords)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'username & password required' });
  const u = await User.findOne({ username, password });
  if (!u) return res.status(401).json({ message: 'invalid credentials' });
  res.json({ username: u.username, role: u.role, name: u.name, contact: u.contact });
});

// List technicians
app.get('/api/technicians', async (req, res) => {
  const list = await User.find({ role: 'technician' }).select('username name contact -_id');
  res.json(list);
});

app.post('/api/complaints/:id/vote', async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).send('Not found');
  c.votes = (c.votes || 0) + 1;
  computePriority(c);
  await c.save();
  res.json(c);
});

app.post('/api/complaints/resolve', async (req, res) => {
  const top = await Complaint.findOne({ status: 'Submitted' }).sort({ priorityScore: -1, createdAt: 1 });
  if (!top) return res.json({ message: 'No pending complaints' });
  top.status = 'Resolved';
  await top.save();
  res.json(top);
});

app.post('/api/complaints/:id/withdraw', async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).send('Not found');
  c.status = 'Withdrawn';
  await c.save();
  await Action.create({ type: 'withdraw', complaintId: c._id });
  res.json(c);
});

app.post('/api/complaints/undo', async (req, res) => {
  const action = await Action.findOne({ type: 'withdraw' }).sort({ createdAt: -1 });
  if (!action) return res.status(400).json({ message: 'Nothing to undo' });
  const c = await Complaint.findById(action.complaintId);
  if (!c) return res.status(404).send('Not found');
  c.status = 'Reopened';
  computePriority(c);
  await c.save();
  await action.deleteOne();
  res.json(c);
});

// Notifications endpoint
app.get('/api/notifications', async (req, res) => {
  const { role, name } = req.query;
  if (!role) return res.status(400).json({ message: 'role is required (admin|technician|student)' });
  let filter = { recipientRole: role };
  if (name && (role === 'technician' || role === 'student')) filter.recipientName = name;
  const list = await Notification.find(filter).sort({ createdAt: -1 });
  res.json(list);
});

// Assign complaint to a technician (admin action)
app.post('/api/complaints/:id/assign', async (req, res) => {
  const { technician } = req.body;
  if (!technician) return res.status(400).json({ message: 'technician is required' });
  const tech = await User.findOne({ username: technician, role: 'technician' });
  if (!tech) return res.status(400).json({ message: 'unknown technician' });
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).send('Not found');
  c.assignedTo = technician;
  c.status = 'Assigned';
  await c.save();
  await Notification.create({ type: 'assigned', message: `Complaint ${c._id} assigned to ${tech.name || technician}`, recipientRole: 'technician', recipientName: technician, complaintId: c._id });
  res.json(c);
});

// Technician marks an assigned complaint resolved
app.post('/api/complaints/:id/markResolved', async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).send('Not found');
  c.status = 'Resolved';
  await c.save();
  // Notify admin and the user
  await Notification.create({ type: 'resolved', message: `Complaint ${c._id} resolved by ${c.assignedTo}`, recipientRole: 'admin', complaintId: c._id });
  if (c.user) await Notification.create({ type: 'resolved_student', message: `Your complaint ${c._id} has been resolved`, recipientRole: 'student', recipientName: c.user, complaintId: c._id });
  res.json(c);
});
