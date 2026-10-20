const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const DiffMatchPatch = require('diff-match-patch');
const crypto = require('crypto');
const zlib = require('zlib');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const dmp = new DiffMatchPatch();

// Password Hashing Helper
function hashPassword(password) {
  const salt = 'doc_evo_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  studentId: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'group_leader', 'lecturer', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// MongoDB Setup & Admin Seeding
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://docadmin:docadmin123@cluster0.p6utr.mongodb.net/document-evolution?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB:', MONGODB_URI.startsWith('mongodb+srv') ? 'Cloud MongoDB Atlas' : 'Local MongoDB');
    try {
      const adminExists = await User.findOne({ username: 'admin' });
      if (!adminExists) {
        await User.create({
          username: 'admin',
          name: 'System Administrator',
          studentId: 'ADMIN01',
          email: 'admin@docutrace.org',
          passwordHash: hashPassword('admin123'),
          role: 'admin'
        });
        console.log('Default admin user created: admin / admin123');
      }
    } catch (seedErr) {
      console.error('Admin seeding notice:', seedErr.message);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: String,
  content: String,
  collaborators: [String],
  owner: { type: String, default: 'student' }, // username or studentId of owner
  ownerName: { type: String, default: 'Student Author' }, // Full name of owner
  allowedUsers: { type: [String], default: [] }, // Array of permitted usernames/studentIds
  isPublic: { type: Boolean, default: false },
  source: { type: String, default: 'in_built' }, // 'in_built', 'google_docs', 'microsoft_365'
  externalId: String,
  syncStatus: { type: String, default: 'synced' }, // 'synced', 'offline'
  assignmentType: { type: String, enum: ['individual', 'group'], default: 'group' },
  course: { type: String, default: 'Software Engineering' },
  instructions: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  createdByLecturer: { type: String, default: null },
  submissionStatus: { type: String, enum: ['not_started', 'in_progress', 'submitted'], default: 'in_progress' },
  submittedAt: { type: Date, default: null },
  submittedBy: { type: String, default: null },
  grade: { type: String, default: '' },
  lecturerFeedback: { type: String, default: '' },
  vivaRequired: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Document = mongoose.model('Document', DocumentSchema);

// Permission Checker Helper
function hasDocumentAccess(doc, username, studentId, role, email, userObj = null, strictUserOnly = false) {
  if (!doc) return false;

  // When not in strictUserOnly mode, system roles and public docs bypass checks
  if (!strictUserOnly) {
    // System Administrators have full superuser access to all documents without restriction
    if (role === 'admin' || (username && username.toLowerCase().trim() === 'admin')) {
      return true;
    }
    // Lecturers and evaluators have full supervisory access to all student assignments
    if (role === 'lecturer' || role === 'teacher' || role === 'evaluator' || (username && username.toLowerCase().trim() === 'sansala')) {
      return true;
    }
    // Once an assignment is submitted, lecturers/evaluators and admins can always access it
    if (doc.submissionStatus === 'submitted') {
      if (role === 'lecturer' || role === 'admin') return true;
    }
    if (doc.isPublic) return true;
  }

  // Gather all possible identifiers representing this user
  const identifiers = new Set();
  const addId = (val) => {
    if (val && typeof val === 'string' && val.trim()) {
      const clean = val.toLowerCase().trim();
      identifiers.add(clean);
      // If val is formatted like "Name (ID)", also add name and ID components
      const parenMatch = clean.match(/^(.+?)\s*\((.+?)\)$/);
      if (parenMatch) {
        if (parenMatch[1].trim()) identifiers.add(parenMatch[1].trim());
        if (parenMatch[2].trim()) identifiers.add(parenMatch[2].trim());
      }
    }
  };

  addId(username);
  addId(studentId);
  addId(email);

  if (userObj) {
    addId(userObj.username);
    addId(userObj.studentId);
    addId(userObj.email);
    addId(userObj.name);
  }

  const idList = Array.from(identifiers);
  if (idList.length === 0) return false;

  const docOwner = (doc.owner || '').toLowerCase().trim();
  const docOwnerName = (doc.ownerName || '').toLowerCase().trim();

  // 1. Check Owner match (exact owner username, exact owner name, or parenthesized student ID)
  for (const id of idList) {
    if (docOwner === id || docOwnerName === id || docOwnerName.includes(`(${id})`) || docOwnerName.includes(id)) {
      return true;
    }
    const ownerMatch = docOwnerName.match(/^(.+?)\s*\((.+?)\)$/);
    if (ownerMatch) {
      if (ownerMatch[1].trim() === id || ownerMatch[2].trim() === id) {
        return true;
      }
    }
  }

  // 2. Check Allowed Users array (exact match or substring against stored username, student ID, or email)
  const allowed = (doc.allowedUsers || []).map(u => (u || '').toLowerCase().trim()).filter(Boolean);
  for (const u of allowed) {
    for (const id of idList) {
      if (u === id || u.includes(`(${id})`) || u.includes(id)) {
        return true;
      }
    }
  }

  // 3. Check Collaborators array (exact match, extracted Name, or extracted ID from "Name (StudentId)")
  const collabs = (doc.collaborators || []).map(c => (c || '').toLowerCase().trim()).filter(Boolean);
  for (const c of collabs) {
    for (const id of idList) {
      if (c === id || c.includes(`(${id})`) || c.includes(id)) {
        return true;
      }
    }
    const collabMatch = c.match(/^(.+?)\s*\((.+?)\)$/);
    if (collabMatch) {
      const namePart = collabMatch[1].trim();
      const idPart = collabMatch[2].trim();
      if (idList.includes(namePart) || idList.includes(idPart)) {
        return true;
      }
    }
  }

  return false;
}

const RevisionSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  author: { type: String, required: true },
  anonymizedAuthorId: { type: String },
  timestamp: { type: Date, default: Date.now },
  section: { type: String, default: "General" },
  beforeText: { type: String, default: "" },
  afterText: { type: String, default: "" },
  addedText: { type: String, default: "" },
  deletedText: { type: String, default: "" },
  wordCountAdded: { type: Number, default: 0 },
  wordCountDeleted: { type: Number, default: 0 },
  sourcePlatform: { type: String, default: 'in_built' }, // 'in_built', 'google_docs', 'microsoft_365'
  syncStatus: { type: String, default: 'synced' }, // 'synced', 'offline'
  predictedIntent: {
    type: String,
    enum: [
      'Language Correction',
      'Paraphrasing',
      'Content Addition',
      'Evidence/Citation Addition',
      'Content Removal',
      'Structural Reorganization',
      'Unclassified'
    ],
    default: 'Unclassified'
  },
  predictedSignificance: {
    type: String,
    enum: ['Minor', 'Moderate', 'Major', 'Unclassified'],
    default: 'Unclassified'
  },
  semanticDistance: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  modelVersion: { type: String, default: 'v1.0-rules-ml-ensemble' },
  explanation: { type: String, default: '' },
  features: { type: mongoose.Schema.Types.Mixed, default: {} },
  isBulkInsertion: { type: Boolean, default: false },
  anomalyFlag: { type: String, default: null } // e.g. 'High-Volume Paste Event Detected'
});
const Revision = mongoose.model('Revision', RevisionSchema);

// Anonymization Helper (Privacy-Preserving Author Telemetry)
function generateAnonymizedAuthorId(author) {
  if (!author) return 'STU_ANON';
  const hash = crypto.createHash('sha256').update(author.toLowerCase().trim() + '_salt2026').digest('hex');
  return `STU_${hash.substring(0, 6).toUpperCase()}`;
}

// ML Revision Classification Client (Calls Python FastAPI on port 8002 with built-in fallback)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8002/api/v1/ml/classify-revision';

async function classifyRevisionWithML(beforeText, afterText, section = "General") {
  try {
    const res = await fetch(ML_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(300),
      body: JSON.stringify({
        before_text: beforeText || "",
        after_text: afterText || "",
        section: section || "General"
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Graceful instantaneous fallback if ML service is booting or unreachable
  }

  // Built-in rule-based fallback matching standard taxonomy criteria
  const b = (beforeText || "").trim();
  const a = (afterText || "").trim();
  const bWords = b ? b.split(/\s+/).length : 0;
  const aWords = a ? a.split(/\s+/).length : 0;
  const added = Math.max(0, aWords - bWords);
  const deleted = Math.max(0, bWords - aWords);

  // Evidence detection
  if (/\[\d+\]|\([A-Z][a-z]+,\s*\d{4}\)|https?:\/\//i.test(a) && !/\[\d+\]|\([A-Z][a-z]+,\s*\d{4}\)|https?:\/\//i.test(b)) {
    return {
      predicted_intent: 'Evidence/Citation Addition',
      predicted_significance: added > 15 ? 'Major' : 'Moderate',
      semantic_distance: 0.35,
      confidence: 0.90,
      model_version: 'v1.0-rules-ml-ensemble',
      explanation: 'Detected addition of academic citation or reference markers.'
    };
  }

  // Structural Reorganization
  if (/<h[1-6]|#+\s/i.test(a) && !/<h[1-6]|#+\s/i.test(b)) {
    return {
      predicted_intent: 'Structural Reorganization',
      predicted_significance: 'Moderate',
      semantic_distance: 0.50,
      confidence: 0.88,
      model_version: 'v1.0-rules-ml-ensemble',
      explanation: 'Section or heading structural modification detected.'
    };
  }

  // Content Addition
  if (added > 12) {
    return {
      predicted_intent: 'Content Addition',
      predicted_significance: added > 60 ? 'Major' : 'Moderate',
      semantic_distance: Math.min(0.9, 0.2 + added * 0.01),
      confidence: 0.92,
      model_version: 'v1.0-rules-ml-ensemble',
      explanation: `Added ${added} words of substantive content.`
    };
  }

  // Content Removal
  if (deleted > 12) {
    return {
      predicted_intent: 'Content Removal',
      predicted_significance: deleted > 50 ? 'Major' : 'Moderate',
      semantic_distance: Math.min(0.9, 0.2 + deleted * 0.01),
      confidence: 0.90,
      model_version: 'v1.0-rules-ml-ensemble',
      explanation: `Deleted ${deleted} words of content.`
    };
  }

  // Paraphrasing vs Language Correction
  if (Math.abs(aWords - bWords) <= 6 && Math.min(aWords, bWords) >= 5) {
    return {
      predicted_intent: 'Paraphrasing',
      predicted_significance: 'Moderate',
      semantic_distance: 0.40,
      confidence: 0.85,
      model_version: 'v1.0-rules-ml-ensemble',
      explanation: 'Wording rephrased while preserving approximate sentence length.'
    };
  }

  return {
    predicted_intent: 'Language Correction',
    predicted_significance: 'Minor',
    semantic_distance: 0.08,
    confidence: 0.89,
    model_version: 'v1.0-rules-ml-ensemble',
    explanation: 'Localized wording, grammar, or punctuation adjustment.'
  };
}

// Helper function to extract text from HTML (safe version)
const stripHtml = (html) => (typeof html === 'string' ? html.replace(/<[^>]*>?/gm, '') : '');

// Socket.io for Real-Time Collaborative Editing & Diffing
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-document', async (data) => {
    let documentId = null;
    let username = null;
    let studentId = null;
    let role = null;
    let email = null;
    let name = null;

    if (typeof data === 'string') {
      documentId = data;
    } else if (data && typeof data === 'object') {
      documentId = typeof data.documentId === 'string' ? data.documentId : (typeof data.id === 'string' ? data.id : null);
      username = typeof data.username === 'string' ? data.username : null;
      studentId = typeof data.studentId === 'string' ? data.studentId : null;
      role = typeof data.role === 'string' ? data.role : null;
      email = typeof data.email === 'string' ? data.email : null;
      name = typeof data.name === 'string' ? data.name : null;
    }

    if (!documentId) return;

    let doc = await Document.findOne({ _id: documentId });
    if (!doc) {
      const displayName = (name && studentId)
        ? `${name} (${studentId})`
        : (username && studentId ? `${username} (${studentId})` : (name || username || 'Group Leader'));
      doc = await Document.create({
        _id: documentId,
        title: "Untitled Group Document",
        content: "<p>Start writing here...</p>",
        owner: username ? username.toLowerCase().trim() : 'system',
        ownerName: displayName,
        collaborators: [displayName],
        allowedUsers: username ? [username.toLowerCase().trim()] : []
      });
    }

    // Security permission guard with full alias resolution
    let userObj = null;
    if (username || studentId || role || email) {
      try {
        const queryConds = [];
        if (username) {
          queryConds.push({ username: username.toLowerCase().trim() });
          queryConds.push({ username: new RegExp('^' + username.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        }
        if (studentId) {
          queryConds.push({ studentId: studentId.trim() });
          queryConds.push({ studentId: new RegExp('^' + studentId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        }
        if (email) {
          queryConds.push({ email: email.toLowerCase().trim() });
          queryConds.push({ email: new RegExp('^' + email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        }
        if (name) {
          queryConds.push({ name: new RegExp('^' + name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        }
        if (queryConds.length > 0) {
          userObj = await User.findOne({ $or: queryConds }).lean();
        }
      } catch (e) {
        console.error("User lookup error in join-document:", e);
      }

      const allowed = hasDocumentAccess(doc, username, studentId, role, email, userObj);
      if (!allowed) {
        socket.emit('access-denied', {
          error: 'Access Denied: You do not have permission to join this document session.',
          ownerName: doc.ownerName || doc.owner || "Group Leader"
        });
        return;
      }
    }

    socket.data.user = { username, studentId, email, name, role, userObj };
    socket.data.allowedDocs = socket.data.allowedDocs || new Set();
    socket.data.allowedDocs.add(documentId);

    socket.join(documentId);
    socket.emit('load-document', doc.content);
  });

  socket.on('send-changes', async (payload) => {
    if (!payload || typeof payload !== 'object') return;
    const { documentId, content, author, studentId, username, email, role } = payload;
    if (!documentId) return;

    const doc = await Document.findOne({ _id: documentId });
    if (!doc) return;

    const rooms = Array.from(socket.rooms || []);
    const alreadyAuthorized = rooms.includes(documentId) || (socket.data?.allowedDocs && socket.data.allowedDocs.has(documentId));

    if (!alreadyAuthorized) {
      let userObj = socket.data?.user?.userObj || null;
      if (!userObj) {
        try {
          const queryConds = [];
          const sId = studentId || socket.data?.user?.studentId;
          const uName = username || socket.data?.user?.username;
          const uEmail = email || socket.data?.user?.email;
          if (sId) {
            queryConds.push({ studentId: new RegExp('^' + sId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
            queryConds.push({ username: sId.toLowerCase().trim() });
          }
          if (uName) {
            queryConds.push({ username: new RegExp('^' + uName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
          }
          if (uEmail) {
            queryConds.push({ email: new RegExp('^' + uEmail.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
          }
          if (author && typeof author === 'string') {
            const m = author.match(/^(.+?)\s*\((.+?)\)$/);
            if (m) {
              queryConds.push({ name: new RegExp('^' + m[1].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
              queryConds.push({ studentId: new RegExp('^' + m[2].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
            }
          }
          if (queryConds.length > 0) {
            userObj = await User.findOne({ $or: queryConds }).lean();
          }
        } catch (e) {}
      }

      const isPermitted = hasDocumentAccess(doc, username || socket.data?.user?.username || author, studentId || socket.data?.user?.studentId, role || socket.data?.user?.role || 'student', email || socket.data?.user?.email, userObj);
      if (isPermitted) {
        socket.data.allowedDocs = socket.data.allowedDocs || new Set();
        socket.data.allowedDocs.add(documentId);
        socket.join(documentId);
      } else {
        console.warn(`[send-changes] Unauthorized change attempt dropped for doc: ${documentId}`);
        return;
      }
    } else if (!rooms.includes(documentId)) {
      socket.join(documentId);
    }

    if (doc) {
      // Broadcast changes to peers only after verification
      socket.broadcast.to(documentId).emit('receive-changes', content);

      const oldText = stripHtml(doc.content);
      const newText = stripHtml(content);

      const diffs = dmp.diff_main(oldText, newText);
      dmp.diff_cleanupSemantic(diffs);

      let added = "";
      let deleted = "";
      let wordsAdded = 0;
      let wordsDeleted = 0;

      diffs.forEach(([op, text]) => {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (op === 1) { // Insert
          added += text + " ";
          wordsAdded += words;
        } else if (op === -1) { // Delete
          deleted += text + " ";
          wordsDeleted += words;
        }
      });

      if (wordsAdded > 0 || wordsDeleted > 0) {
        // Strict Security Guard 3: Bulk Paste / Insertion Anomaly Detection
        const now = new Date();
        const timeSinceLastEditSec = doc.updatedAt ? Math.max(1, (now.getTime() - new Date(doc.updatedAt).getTime()) / 1000) : 5;
        const isBulk = wordsAdded >= 80 && (wordsAdded / timeSinceLastEditSec) > 15;
        const anomaly = isBulk ? 'High-Volume Paste Event Detected' : null;

        // Check if there is a consecutive micro-edit revision by the same author within 20s
        const recentRev = await Revision.findOne({
          documentId,
          author: author || "Anonymous"
        }).sort({ timestamp: -1 });

        const isConsecutiveMicro = recentRev &&
          (now.getTime() - new Date(recentRev.timestamp).getTime() < 20000) &&
          !isBulk;

        if (isConsecutiveMicro) {
          // Consolidate into the active typing revision session
          recentRev.afterText = newText;
          if (added.trim()) {
            recentRev.addedText = (recentRev.addedText ? (recentRev.addedText + " " + added.trim()) : added.trim()).trim();
          }
          if (deleted.trim()) {
            recentRev.deletedText = (recentRev.deletedText ? (recentRev.deletedText + " " + deleted.trim()) : deleted.trim()).trim();
          }
          recentRev.wordCountAdded += wordsAdded;
          recentRev.wordCountDeleted += wordsDeleted;
          recentRev.timestamp = now;
          await recentRev.save();
        } else {
          // Run ML Classification on Before/After Pair
          const mlRes = await classifyRevisionWithML(oldText, newText, "General");

          const explanationText = isBulk
            ? `[Heuristic Flag] High-volume bulk insertion: +${wordsAdded} words in ${Math.round(timeSinceLastEditSec)}s. Flagged for reviewer inspection; does not constitute automated proof of misconduct.`
            : (mlRes.explanation || '');

          await Revision.create({
            documentId,
            author: author || "Anonymous",
            anonymizedAuthorId: generateAnonymizedAuthorId(author),
            timestamp: new Date(),
            section: "General",
            beforeText: oldText,
            afterText: newText,
            addedText: added.trim(),
            deletedText: deleted.trim(),
            wordCountAdded: wordsAdded,
            wordCountDeleted: wordsDeleted,
            sourcePlatform: doc.source || 'in_built',
            syncStatus: 'synced',
            predictedIntent: isBulk ? 'Content Addition' : (mlRes.predicted_intent || 'Unclassified'),
            predictedSignificance: isBulk ? 'Major' : (mlRes.predicted_significance || 'Unclassified'),
            semanticDistance: mlRes.semantic_distance || 0.0,
            confidence: mlRes.confidence || 0.0,
            modelVersion: mlRes.model_version || 'v1.0-rules-ml-ensemble',
            explanation: explanationText,
            features: mlRes.features || {},
            isBulkInsertion: isBulk,
            anomalyFlag: anomaly
          });
        }
      }

      if (author) {
        const authorTrimmed = author.trim();
        const authorBase = authorTrimmed.includes('(') ? authorTrimmed.split('(')[0].trim().toLowerCase() : authorTrimmed.toLowerCase();

        doc.collaborators = (doc.collaborators || []).filter(c => {
          if (!c) return false;
          const cTrimmed = c.trim();
          const cBase = cTrimmed.includes('(') ? cTrimmed.split('(')[0].trim().toLowerCase() : cTrimmed.toLowerCase();
          return cTrimmed === authorTrimmed || cBase !== authorBase;
        });

        if (!doc.collaborators.includes(authorTrimmed)) {
          doc.collaborators.push(authorTrimmed);
        }

        if (doc.ownerName) {
          const ownerBase = doc.ownerName.includes('(') ? doc.ownerName.split('(')[0].trim().toLowerCase() : doc.ownerName.trim().toLowerCase();
          if (ownerBase === authorBase && !doc.ownerName.includes('(') && authorTrimmed.includes('(')) {
            doc.ownerName = authorTrimmed;
          }
        }
      }

      doc.content = content;
      doc.updatedAt = Date.now();
      await doc.save();

      if (wordsAdded > 0 || wordsDeleted > 0) {
        io.to(documentId).emit('markup-updated');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Authentication APIs

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, name, studentId, email, password, role } = req.body;

    if (!username || !name || !studentId || !email || !password) {
      return res.status(400).json({ error: 'All fields (Username, Name, Student ID, Email, Password) are required.' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanStudentId = studentId.trim();

    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const existingStudentId = await User.findOne({
      studentId: new RegExp('^' + cleanStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    });
    if (existingStudentId) {
      return res.status(400).json({ error: `Student ID / IT number (${cleanStudentId}) is already registered to another account.` });
    }

    const passwordHash = hashPassword(password);
    const validRoles = ['student', 'group_leader', 'lecturer', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'student';
    const newUser = await User.create({
      username: cleanUsername,
      name: name.trim(),
      studentId: studentId.trim(),
      email: cleanEmail,
      passwordHash,
      role: assignedRole
    });

    const isLeader = newUser.role === 'group_leader' || newUser.role === 'lecturer' || newUser.role === 'admin';
    const userData = {
      id: newUser._id,
      username: newUser.username,
      name: newUser.name,
      studentId: newUser.studentId,
      email: newUser.email,
      role: newUser.role,
      isLeader,
      displayName: `${newUser.name} (${newUser.studentId})`
    };

    res.status(201).json({ message: 'Registration successful', user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and Password are required.' });
    }

    const cleanId = identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ username: cleanId }, { email: cleanId }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const hash = hashPassword(password);
    if (user.passwordHash !== hash) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    const isLeader = user.role === 'group_leader' || user.role === 'lecturer';
    const userData = {
      id: user._id,
      username: user.username,
      name: user.name,
      studentId: user.studentId,
      email: user.email,
      role: user.role,
      isLeader,
      displayName: `${user.name} (${user.studentId})`
    };

    res.json({ message: 'Login successful', user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/users', async (req, res) => {
  try {
    const { role, studentsOnly } = req.query;
    let query = {};
    if (studentsOnly === 'true' || role === 'student') {
      query = {
        role: { $in: ['student', 'group_leader'] },
        username: { $nin: ['admin', 'sansala'] }
      };
    } else if (role) {
      query = { role };
    }
    const users = await User.find(query, '-passwordHash').sort('name').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Document Management & Access Security APIs

app.post('/api/documents/create', async (req, res) => {
  try {
    const {
      title,
      content,
      owner,
      ownerName,
      studentId,
      source,
      members,
      assignmentType,
      course,
      instructions,
      dueDate,
      createdByLecturer,
      assignedTo
    } = req.body;

    if (!title || !owner) {
      return res.status(400).json({ error: 'Document / Assignment title and owner identifier are required.' });
    }

    const cleanOwner = owner.toLowerCase().trim();
    const cleanStudentId = studentId ? studentId.toLowerCase().trim() : '';

    let formattedOwnerName = ownerName || owner || 'Student Author';
    if (studentId && cleanStudentId && !formattedOwnerName.toLowerCase().includes(cleanStudentId)) {
      formattedOwnerName = `${formattedOwnerName} (${studentId.trim()})`;
    }

    // Process initial group members / assigned students
    const initialAllowed = [cleanOwner, cleanStudentId].filter(Boolean);
    const initialCollabs = [formattedOwnerName];

    // Include owner's full DB aliases (username, studentId, email) so owner is never locked out
    try {
      const ownerRecord = await User.findOne({
        $or: [
          { username: cleanOwner },
          { studentId: cleanOwner },
          cleanStudentId ? { studentId: cleanStudentId } : null,
          cleanStudentId ? { studentId: new RegExp('^' + cleanStudentId + '$', 'i') } : null
        ].filter(Boolean)
      }).lean();
      if (ownerRecord) {
        if (ownerRecord.username && !initialAllowed.includes(ownerRecord.username.toLowerCase())) {
          initialAllowed.push(ownerRecord.username.toLowerCase());
        }
        if (ownerRecord.studentId && !initialAllowed.includes(ownerRecord.studentId.toLowerCase())) {
          initialAllowed.push(ownerRecord.studentId.toLowerCase());
        }
        if (ownerRecord.email && !initialAllowed.includes(ownerRecord.email.toLowerCase())) {
          initialAllowed.push(ownerRecord.email.toLowerCase());
        }
      }
    } catch (e) {}

    // If assignedTo array passed from lecturer, add all students
    const targetMembers = Array.isArray(assignedTo) && assignedTo.length > 0 ? assignedTo : members;
    let memberList = [];
    if (Array.isArray(targetMembers)) {
      memberList = targetMembers;
    } else if (typeof targetMembers === 'string' && targetMembers.trim()) {
      memberList = targetMembers.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    }

    for (const m of memberList) {
      if (!m || typeof m !== 'string') continue;
      const cleanM = m.toLowerCase().trim();
      if (!cleanM) continue;

      const foundUser = await User.findOne({
        $or: [
          { username: cleanM },
          { studentId: cleanM },
          { email: cleanM },
          { name: new RegExp('^' + cleanM + '$', 'i') }
        ]
      }).lean();

      if (foundUser) {
        if (foundUser.username && !initialAllowed.includes(foundUser.username.toLowerCase())) {
          initialAllowed.push(foundUser.username.toLowerCase());
        }
        if (foundUser.studentId && !initialAllowed.includes(foundUser.studentId.toLowerCase())) {
          initialAllowed.push(foundUser.studentId.toLowerCase());
        }
        if (foundUser.email && !initialAllowed.includes(foundUser.email.toLowerCase())) {
          initialAllowed.push(foundUser.email.toLowerCase());
        }
        const displayName = `${foundUser.name} (${foundUser.studentId})`;
        if (!initialCollabs.includes(displayName)) {
          initialCollabs.push(displayName);
        }
      } else {
        if (!initialAllowed.includes(cleanM)) initialAllowed.push(cleanM);
        if (!initialCollabs.includes(m.trim())) initialCollabs.push(m.trim());
      }
    }

    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    
    // Default initial starter template
    let initialContent = content;
    if (!initialContent) {
      if (createdByLecturer) {
        initialContent = `<h2>${title.trim()}</h2><p><strong>Course:</strong> ${course || 'Software Engineering'}</p><p><strong>Assignment Type:</strong> ${assignmentType === 'individual' ? 'Individual Project' : 'Group Collaborative Project'}</p>${instructions ? `<hr/><p><strong>Lecturer Instructions:</strong></p><p>${instructions.trim()}</p><hr/>` : ''}<p><em>Start drafting your assignment solution below:</em></p><p></p>`;
      } else {
        initialContent = `<h2>${title.trim()}</h2><p>Document created by group leader ${formattedOwnerName}. Start writing report here...</p>`;
      }
    }

    const newDoc = await Document.create({
      _id: docId,
      title: title.trim(),
      content: initialContent,
      owner: cleanOwner,
      ownerName: formattedOwnerName,
      allowedUsers: initialAllowed,
      collaborators: initialCollabs,
      source: source || 'in_built',
      assignmentType: assignmentType || 'group',
      course: course || 'Software Engineering',
      instructions: instructions || '',
      dueDate: dueDate || '',
      createdByLecturer: createdByLecturer || null,
      submissionStatus: 'in_progress',
      syncStatus: 'synced'
    });

    res.status(201).json({ message: 'Assignment created successfully', document: newDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/:id/submit', async (req, res) => {
  try {
    const { submittedBy, studentId } = req.body;
    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    doc.submissionStatus = 'submitted';
    doc.submittedAt = Date.now();
    doc.submittedBy = submittedBy || studentId || doc.ownerName || 'Student Author';
    doc.updatedAt = Date.now();
    await doc.save();

    res.json({ message: "Assignment submitted successfully to lecturer", document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/:id/grade', async (req, res) => {
  try {
    const { grade, lecturerFeedback, vivaRequired } = req.body;
    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (grade !== undefined) doc.grade = grade;
    if (lecturerFeedback !== undefined) doc.lecturerFeedback = lecturerFeedback;
    if (vivaRequired !== undefined) doc.vivaRequired = Boolean(vivaRequired);
    doc.updatedAt = Date.now();
    await doc.save();

    res.json({ message: "Grade and feedback saved successfully", document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const { username, studentId, role, email, userOnly } = req.query;
    const isStrictUserOnly = userOnly === 'true' || userOnly === true;

    // Security Gate: Without logging in, do NOT expose any documents or assignments
    if (!username && !studentId && !role && !email) {
      return res.json([]);
    }

    const allDocs = await Document.find({}).sort('-updatedAt').lean();
    
    // System Administrators and Lecturers can see all documents UNLESS userOnly=true is requested
    if ((role === 'admin' || role === 'lecturer' || (username && (username.toLowerCase().trim() === 'admin' || username.toLowerCase().trim() === 'sansala'))) && !isStrictUserOnly) {
      return res.json(allDocs);
    }

    // Resolve user in database to retrieve all registered aliases (username, studentId, email, name)
    let userObj = null;
    const cleanUser = username ? username.toLowerCase().trim() : '';
    const cleanStudentId = studentId ? studentId.trim() : '';
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (cleanUser || cleanEmail || cleanStudentId) {
      userObj = await User.findOne({
        $or: [
          cleanUser ? { username: new RegExp('^' + cleanUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } : null,
          cleanEmail ? { email: new RegExp('^' + cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } : null,
          cleanStudentId ? { studentId: new RegExp('^' + cleanStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } : null
        ].filter(Boolean)
      }).lean();
    }

    // Filter to only assignments relevant to user's ownership or collaboration
    const filtered = allDocs.filter(doc => hasDocumentAccess(doc, username, studentId, role, email, userObj, isStrictUserOnly));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lecturer/overview', async (req, res) => {
  try {
    const docs = await Document.find({}).sort('-updatedAt').lean();
    const users = await User.find({}, '-passwordHash').lean();
    const allRevs = await Revision.find({}).sort('timestamp').lean();

    // Map revisions by documentId
    const revsByDoc = {};
    allRevs.forEach(r => {
      if (!revsByDoc[r.documentId]) revsByDoc[r.documentId] = [];
      revsByDoc[r.documentId].push(r);
    });

    // Map users by username / studentId
    const userMap = {};
    users.forEach(u => {
      if (u.username) userMap[u.username.toLowerCase()] = u;
      if (u.studentId) userMap[u.studentId.toLowerCase()] = u;
    });

    let totalWordsAll = 0;
    let totalAnomaliesAll = 0;
    let authenticitySum = 0;

    const assignments = docs.map(doc => {
      const docRevs = revsByDoc[doc._id] || [];
      const plainText = stripHtml(doc.content || '').trim();
      const rawWords = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
      
      const revWordsAdded = docRevs.reduce((sum, r) => sum + (r.wordCountAdded || 0), 0);
      const totalWords = Math.max(rawWords, revWordsAdded);
      totalWordsAll += totalWords;

      // Authors detection
      const rawAuthors = new Set();
      if (doc.ownerName) rawAuthors.add(doc.ownerName);
      if (doc.collaborators) doc.collaborators.forEach(c => rawAuthors.add(c));
      docRevs.forEach(r => { if (r.author) rawAuthors.add(r.author); });
      const authors = Array.from(rawAuthors);
      const activeAuthorsCount = Math.max(1, authors.length);

      // Paste anomalies
      const pasteAnomalies = docRevs.filter(r => r.isBulkInsertion || r.anomalyFlag);
      const pasteAnomaliesCount = pasteAnomalies.length;
      totalAnomaliesAll += pasteAnomaliesCount;

      const batchPastePercent = pasteAnomaliesCount > 0 ? Math.min(35, pasteAnomaliesCount * 6) : 0;
      const incrementalDraftingPercent = Math.max(65, 100 - batchPastePercent);

      // Workload equity score
      let workloadEquityScore = 90;
      if (activeAuthorsCount > 1 && totalWords > 0) {
        const authorWordMap = {};
        authors.forEach(a => { authorWordMap[a] = 0; });
        docRevs.forEach(r => {
          const a = r.author || authors[0];
          authorWordMap[a] = (authorWordMap[a] || 0) + (r.wordCountAdded || 0);
        });
        const shares = Object.values(authorWordMap).map(w => w / (totalWords || 1));
        const idealShare = 1 / activeAuthorsCount;
        const deviation = shares.reduce((acc, s) => acc + Math.abs(s - idealShare), 0) / 2;
        workloadEquityScore = Math.round(Math.max(40, Math.min(98, (1 - deviation) * 100)));
      } else if (activeAuthorsCount === 1) {
        workloadEquityScore = 95;
      }

      const authenticityScore = Math.round(0.6 * workloadEquityScore + 0.4 * incrementalDraftingPercent);
      authenticitySum += authenticityScore;

      // Status
      let status = 'verified';
      if (pasteAnomaliesCount > 0 || authenticityScore < 60) {
        status = 'flagged';
      } else if (docRevs.length === 0) {
        status = 'draft';
      }

      // Owner info resolution
      const ownerUser = userMap[doc.owner ? doc.owner.toLowerCase() : ''] || {};

      return {
        _id: doc._id,
        title: doc.title || 'Untitled Document',
        owner: doc.owner,
        ownerName: doc.ownerName || (ownerUser.name ? `${ownerUser.name} (${ownerUser.studentId})` : doc.owner),
        studentId: ownerUser.studentId || '',
        email: ownerUser.email || '',
        collaborators: doc.collaborators || [],
        allowedUsers: doc.allowedUsers || [],
        source: doc.source || 'in_built',
        assignmentType: doc.assignmentType || 'group',
        course: doc.course || 'Software Engineering',
        instructions: doc.instructions || '',
        dueDate: doc.dueDate || '',
        createdByLecturer: doc.createdByLecturer || null,
        submissionStatus: doc.submissionStatus || 'in_progress',
        submittedAt: doc.submittedAt || null,
        submittedBy: doc.submittedBy || null,
        grade: doc.grade || '',
        lecturerFeedback: doc.lecturerFeedback || '',
        vivaRequired: Boolean(doc.vivaRequired),
        totalWords,
        revisionsCount: docRevs.length,
        pasteAnomaliesCount,
        batchPastePercent,
        incrementalDraftingPercent,
        workloadEquityScore,
        authenticityScore,
        status,
        activeAuthorsCount,
        authors,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    });

    const totalDocs = docs.length;
    const avgAuthenticity = totalDocs > 0 ? Math.round(authenticitySum / totalDocs) : 0;
    const verifiedCount = assignments.filter(a => a.status === 'verified').length;
    const flaggedCount = assignments.filter(a => a.status === 'flagged').length;

    res.json({
      cohortStats: {
        totalAssignments: totalDocs,
        totalStudents: users.filter(u => u.role !== 'lecturer').length,
        avgAuthenticity,
        verifiedCount,
        flaggedCount,
        totalRevisions: allRevs.length,
        totalWords: totalWordsAll,
        totalAnomalies: totalAnomaliesAll
      },
      assignments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin System Overview: All Documents, All Users, System Telemetry
app.get('/api/admin/overview', async (req, res) => {
  try {
    const docs = await Document.find({}).sort('-updatedAt').lean();
    const users = await User.find({}, '-passwordHash').sort('-createdAt').lean();
    const allRevs = await Revision.find({}).sort('timestamp').lean();

    const revsByDoc = {};
    allRevs.forEach(r => {
      if (!revsByDoc[r.documentId]) revsByDoc[r.documentId] = [];
      revsByDoc[r.documentId].push(r);
    });

    const userMap = {};
    users.forEach(u => {
      if (u.username) userMap[u.username.toLowerCase()] = u;
      if (u.studentId) userMap[u.studentId.toLowerCase()] = u;
    });

    let totalWordsAll = 0;
    let totalAnomaliesAll = 0;
    let authenticitySum = 0;

    const enrichedDocs = docs.map(doc => {
      const docRevs = revsByDoc[doc._id] || [];
      const plainText = stripHtml(doc.content || '').trim();
      const rawWords = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
      const revWordsAdded = docRevs.reduce((sum, r) => sum + (r.wordCountAdded || 0), 0);
      const totalWords = Math.max(rawWords, revWordsAdded);
      totalWordsAll += totalWords;

      const pasteAnomaliesCount = docRevs.filter(r => r.isBulkInsertion || r.anomalyFlag).length;
      totalAnomaliesAll += pasteAnomaliesCount;

      let authenticityScore = 94;
      if (docRevs.length > 0) {
        const pasteRatio = pasteAnomaliesCount / docRevs.length;
        authenticityScore = Math.max(25, Math.min(99, Math.round(98 - (pasteRatio * 75))));
      }
      authenticitySum += authenticityScore;

      const ownerUser = userMap[doc.owner ? doc.owner.toLowerCase() : ''] || {};

      return {
        _id: doc._id,
        title: doc.title || 'Untitled Document',
        content: doc.content || '',
        owner: doc.owner,
        ownerName: doc.ownerName || (ownerUser.name ? `${ownerUser.name} (${ownerUser.studentId})` : doc.owner),
        studentId: ownerUser.studentId || '',
        email: ownerUser.email || '',
        collaborators: doc.collaborators || [],
        allowedUsers: doc.allowedUsers || [],
        source: doc.source || 'in_built',
        assignmentType: doc.assignmentType || 'group',
        course: doc.course || 'Software Engineering',
        instructions: doc.instructions || '',
        dueDate: doc.dueDate || '',
        submissionStatus: doc.submissionStatus || 'in_progress',
        submittedAt: doc.submittedAt || null,
        submittedBy: doc.submittedBy || null,
        grade: doc.grade || '',
        lecturerFeedback: doc.lecturerFeedback || '',
        totalWords,
        revisionsCount: docRevs.length,
        pasteAnomaliesCount,
        authenticityScore,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    });

    const totalDocs = docs.length;
    const avgAuthenticity = totalDocs > 0 ? Math.round(authenticitySum / totalDocs) : 0;

    res.json({
      stats: {
        totalDocuments: totalDocs,
        totalUsers: users.length,
        totalStudents: users.filter(u => u.role === 'student' || u.role === 'group_leader').length,
        totalLecturers: users.filter(u => u.role === 'lecturer').length,
        totalAdmins: users.filter(u => u.role === 'admin').length,
        avgAuthenticity,
        totalRevisions: allRevs.length,
        totalWords: totalWordsAll,
        totalAnomalies: totalAnomaliesAll
      },
      documents: enrichedDocs,
      users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin User Role Update Endpoint
app.post('/api/admin/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'group_leader', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ message: "User role updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const { username, studentId, role, email } = req.query;
    const doc = await Document.findOne({ _id: req.params.id }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Access control check: Admins and Lecturers have unrestricted superuser access
    if (role === 'admin' || role === 'lecturer' || role === 'teacher' || role === 'evaluator' || (username && (username.toLowerCase().trim() === 'admin' || username.toLowerCase().trim() === 'sansala'))) {
      return res.json(doc);
    }

    // Access control check for students
    if (!username && !studentId && !role && !email) {
      return res.status(401).json({ error: "Authentication required to access documents.", isAccessDenied: false });
    }

    let userObj = null;
    const cleanUser = username ? username.toLowerCase().trim() : '';
    const cleanStudentId = studentId ? studentId.trim() : '';
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (cleanUser || cleanStudentId || cleanEmail) {
      userObj = await User.findOne({
        $or: [
          cleanUser ? { username: new RegExp('^' + cleanUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } : null,
          cleanStudentId ? { studentId: new RegExp('^' + cleanStudentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } : null,
          cleanEmail ? { email: new RegExp('^' + cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } : null
        ].filter(Boolean)
      }).lean();
    }

    const allowed = hasDocumentAccess(doc, username, studentId, role, email, userObj);
    if (!allowed) {
      return res.status(403).json({
        error: "Access Denied: You do not have permission to view or edit this document.",
        isAccessDenied: true,
        ownerName: doc.ownerName || doc.owner || "Group Leader"
      });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { username, studentId, role, email } = req.query;
    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Permission check: Owner, allowed user, or lecturer can delete
    if (username || studentId || role || email) {
      let userObj = null;
      const cleanUser = username ? username.toLowerCase().trim() : '';
      const cleanStudentId = studentId ? studentId.trim() : '';
      const cleanEmail = email ? email.toLowerCase().trim() : '';

      if (cleanUser || cleanStudentId || cleanEmail) {
        userObj = await User.findOne({
          $or: [
            cleanUser ? { username: cleanUser } : null,
            cleanStudentId ? { studentId: cleanStudentId } : null,
            cleanEmail ? { email: cleanEmail } : null
          ].filter(Boolean)
        }).lean();
      }

      const isAllowed = hasDocumentAccess(doc, username, studentId, role, email, userObj);
      if (!isAllowed) {
        return res.status(403).json({ error: "Permission Denied: Only document owners, group members, or lecturers can delete this document." });
      }
    }

    // Delete document and purge associated revision logs
    await Document.deleteOne({ _id: req.params.id });
    await Revision.deleteMany({ documentId: req.params.id });

    res.json({ message: "Document deleted successfully", deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/documents/:id/rename', async (req, res) => {
  try {
    const { title, username, studentId, role, email } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Document title cannot be empty." });
    }

    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Permission check
    if (username || studentId || role || email) {
      let userObj = null;
      const cleanUser = username ? username.toLowerCase().trim() : '';
      const cleanStudentId = studentId ? studentId.trim() : '';
      const cleanEmail = email ? email.toLowerCase().trim() : '';

      if (cleanUser || cleanStudentId || cleanEmail) {
        userObj = await User.findOne({
          $or: [
            cleanUser ? { username: cleanUser } : null,
            cleanStudentId ? { studentId: cleanStudentId } : null,
            cleanEmail ? { email: cleanEmail } : null
          ].filter(Boolean)
        }).lean();
      }

      const isAllowed = hasDocumentAccess(doc, username, studentId, role, email, userObj);
      if (!isAllowed) {
        return res.status(403).json({ error: "Permission Denied: Only document owners or group members can rename this document." });
      }
    }

    doc.title = title.trim();
    doc.updatedAt = Date.now();
    await doc.save();

    res.json({ message: "Document renamed successfully", title: doc.title, document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/:id/share', async (req, res) => {
  try {
    const { currentUsername, currentStudentId, currentUserEmail, currentRole, targetUserIdentifier, action } = req.body;
    if (!targetUserIdentifier) {
      return res.status(400).json({ error: 'Target student identifier (Username, Student ID, or Email) is required.' });
    }

    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Permission check for managing shares:
    let requesterUserObj = null;
    const cleanRequester = currentUsername ? currentUsername.toLowerCase().trim() : '';
    const cleanStudentId = currentStudentId ? currentStudentId.trim() : '';
    const cleanEmail = currentUserEmail ? currentUserEmail.toLowerCase().trim() : '';

    if (cleanRequester || cleanStudentId || cleanEmail) {
      requesterUserObj = await User.findOne({
        $or: [
          cleanRequester ? { username: cleanRequester } : null,
          cleanStudentId ? { studentId: cleanStudentId } : null,
          cleanStudentId ? { studentId: new RegExp('^' + cleanStudentId + '$', 'i') } : null,
          cleanEmail ? { email: cleanEmail } : null
        ].filter(Boolean)
      }).lean();
    }

    const isPermitted = hasDocumentAccess(doc, currentUsername, currentStudentId, currentRole, currentUserEmail, requesterUserObj);
    if (!isPermitted && doc.owner && doc.owner !== 'system') {
      return res.status(403).json({ error: 'Only the document owner, group members, or evaluators can manage sharing permissions.' });
    }

    // Parse targetUserIdentifier into array of entries
    let targets = [];
    if (Array.isArray(targetUserIdentifier)) {
      targets = targetUserIdentifier;
    } else if (typeof targetUserIdentifier === 'string') {
      targets = targetUserIdentifier.split(/[,;\n\r\t]+/).map(s => s.trim()).filter(Boolean);
    }

    const addedSummary = [];

    for (const rawTarget of targets) {
      const cleanTarget = rawTarget.toLowerCase().trim();
      if (!cleanTarget) continue;

      // Find target user in database by username, studentId, email, or name
      const targetUser = await User.findOne({
        $or: [
          { username: cleanTarget },
          { studentId: cleanTarget },
          { studentId: new RegExp('^' + cleanTarget + '$', 'i') },
          { email: cleanTarget },
          { name: new RegExp('^' + cleanTarget + '$', 'i') }
        ]
      }).lean();

      const userAliases = new Set([cleanTarget]);
      let displayName = rawTarget.trim();

      if (targetUser) {
        if (targetUser.username) userAliases.add(targetUser.username.toLowerCase());
        if (targetUser.studentId) {
          userAliases.add(targetUser.studentId.toLowerCase());
          userAliases.add(targetUser.studentId);
        }
        if (targetUser.email) userAliases.add(targetUser.email.toLowerCase());
        displayName = `${targetUser.name} (${targetUser.studentId || targetUser.username})`;
      }

      if (action === 'remove') {
        const aliasList = Array.from(userAliases);
        doc.allowedUsers = doc.allowedUsers.filter(u => {
          const lowerU = (u || '').toLowerCase().trim();
          return !aliasList.includes(lowerU);
        });
        doc.collaborators = doc.collaborators.filter(c => {
          const lowerC = (c || '').toLowerCase().trim();
          return !aliasList.some(alias => lowerC.includes(alias));
        });
      } else {
        // Add all aliases to allowedUsers
        for (const alias of userAliases) {
          if (!doc.allowedUsers.some(u => (u || '').toLowerCase() === alias)) {
            doc.allowedUsers.push(alias);
          }
        }
        // Add formatted display name to collaborators
        if (!doc.collaborators.some(c => (c || '').toLowerCase() === displayName.toLowerCase())) {
          doc.collaborators.push(displayName);
        }
        addedSummary.push(displayName);
      }
    }

    doc.updatedAt = Date.now();
    await doc.save();

    res.json({
      message: action === 'remove' ? 'Access permission revoked' : `Permission granted successfully to ${addedSummary.join(', ')}`,
      document: doc,
      allowedUsers: doc.allowedUsers,
      collaborators: doc.collaborators
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/collaborators', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id }).lean();
    res.json(doc ? doc.collaborators : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multi-Author Color-Coded Highlighted Text Attribution API
app.get('/api/documents/:id/author-markup', async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  try {
    const doc = await Document.findOne({ _id: req.params.id }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const revisions = await Revision.find({ documentId: req.params.id }).sort('timestamp').lean();

    // Google Docs Version History Color Palette options for student authors
    const PALETTES = [
      { color: '#4285f4', bgColor: 'rgba(66, 133, 244, 0.22)', borderColor: '#4285f4', badgeBg: '#1a73e8', textColor: '#60a5fa' }, // Google Blue
      { color: '#a142f4', bgColor: 'rgba(161, 66, 244, 0.22)', borderColor: '#a142f4', badgeBg: '#9333ea', textColor: '#c084fc' }, // Google Purple
      { color: '#34a853', bgColor: 'rgba(52, 168, 83, 0.22)', borderColor: '#34a853', badgeBg: '#1e8e3e', textColor: '#4ade80' }, // Google Green
      { color: '#fbbc04', bgColor: 'rgba(251, 188, 4, 0.26)', borderColor: '#f59e0b', badgeBg: '#e37400', textColor: '#fbbf24' }, // Google Yellow/Amber
      { color: '#ea4335', bgColor: 'rgba(234, 67, 53, 0.22)', borderColor: '#ea4335', badgeBg: '#d93025', textColor: '#fb7185' }, // Google Red/Rose
      { color: '#24c1e0', bgColor: 'rgba(36, 193, 224, 0.22)', borderColor: '#24c1e0', badgeBg: '#129eaf', textColor: '#22d3ee' }, // Google Cyan
      { color: '#e52592', bgColor: 'rgba(229, 37, 146, 0.22)', borderColor: '#e52592', badgeBg: '#b80676', textColor: '#f472b6' }, // Google Magenta
      { color: '#5c6bc0', bgColor: 'rgba(92, 107, 192, 0.22)', borderColor: '#5c6bc0', badgeBg: '#3f51b5', textColor: '#818cf8' }, // Google Indigo
    ];

    // Filter out forbidden mock names (never show Alice Cooper, Bob Dylan, Charlie Watts, System Admin)
    const FORBIDDEN_MOCK = ['system admin', 'system', 'alice cooper', 'bob dylan', 'charlie watts', 'alice', 'bob', 'charlie', 'david miller'];
    const isForbidden = (str) => {
      if (!str || typeof str !== 'string') return true;
      const lower = str.toLowerCase().trim();
      return FORBIDDEN_MOCK.some(f => lower === f || lower.startsWith(f + ' ') || lower.endsWith(' ' + f) || lower.includes('alice') || lower.includes('charlie') || lower.includes('bob dylan') || lower.includes('system admin'));
    };

    // Collect all candidate authentic student authors
    const rawAuthors = [];
    if (doc.ownerName && !isForbidden(doc.ownerName)) rawAuthors.push(doc.ownerName.trim());
    if (doc.collaborators) {
      doc.collaborators.forEach(c => {
        if (c && typeof c === 'string' && c.trim() && !isForbidden(c)) rawAuthors.push(c.trim());
      });
    }
    revisions.forEach(r => {
      if (r.author && typeof r.author === 'string' && r.author.trim() && !isForbidden(r.author)) {
        rawAuthors.push(r.author.trim());
      }
    });

    if (rawAuthors.length === 0) {
      const fallback = (doc.ownerName && !isForbidden(doc.ownerName)) ? doc.ownerName.trim() : (doc.owner && doc.owner !== 'student' ? doc.owner : 'Student Author');
      rawAuthors.push(fallback);
    }

    const parseAuthor = (str) => {
      if (!str) return { base: '', id: '' };
      const match = str.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return { base: match[1].trim().toLowerCase(), id: match[2].trim().toLowerCase() };
      }
      return { base: str.trim().toLowerCase(), id: '' };
    };

    const detailedAuthors = Array.from(new Set(rawAuthors.filter(a => a.includes('(') && a.includes(')'))));

    const canonicalMap = {};
    rawAuthors.forEach(raw => {
      const parsed = parseAuthor(raw);
      const match = detailedAuthors.find(det => {
        const detParsed = parseAuthor(det);
        if (parsed.id && detParsed.id === parsed.id) return true;
        if (!parsed.id && parsed.base && detParsed.base === parsed.base) return true;
        return false;
      });

      if (match) {
        canonicalMap[raw] = match;
      } else {
        const existing = Object.values(canonicalMap).find(c => c.toLowerCase() === raw.toLowerCase());
        canonicalMap[raw] = existing || raw;
      }
    });

    const authorList = Array.from(new Set(rawAuthors.map(a => canonicalMap[a] || a)));
    const authorColorMap = {};
    const authorRevStats = {};

    authorList.forEach((author, index) => {
      const palette = PALETTES[index % PALETTES.length];
      authorColorMap[author] = palette;
      authorRevStats[author] = {
        author,
        grossWordsAdded: 0,
        grossWordsDeleted: 0,
        revisionCount: 0,
        ...palette
      };
    });

    // Aggregate revision process telemetry (gross typing activity)
    revisions.forEach(r => {
      if (!r.author || isForbidden(r.author)) return;
      const canonical = canonicalMap[r.author] || r.author;
      if (authorRevStats[canonical]) {
        authorRevStats[canonical].grossWordsAdded += (r.wordCountAdded || 0);
        authorRevStats[canonical].grossWordsDeleted += (r.wordCountDeleted || 0);
        authorRevStats[canonical].revisionCount += 1;
      }
    });

    // Build author text corpus from revisions for content token matching
    const authorAddedCorpus = {};
    for (const a of authorList) authorAddedCorpus[a] = '';
    for (const r of revisions) {
      if (!r.author || isForbidden(r.author)) continue;
      const canonical = canonicalMap[r.author] || r.author;
      if (authorAddedCorpus[canonical] !== undefined) {
        authorAddedCorpus[canonical] += ' ' + (r.addedText || '');
      }
    }

    // Parse document content into text segments
    const rawContent = (doc.content || "").trim();
    const plainDocText = stripHtml(rawContent).trim();
    const isBlank = !plainDocText || rawContent === '<p></p>' || rawContent === '<p><br></p>';

    let currentSegmentIndex = 0;
    const segments = [];

    if (!isBlank) {
      const blocks = rawContent.split(/(<\/p>|<\/h[1-6]>|<\/li>)/gi).filter(Boolean);

      for (let i = 0; i < blocks.length; i += 2) {
        const tagOpenAndBody = blocks[i];
        const tagClose = blocks[i + 1] || '';
        const fullHtmlBlock = tagOpenAndBody + tagClose;

        const plainText = stripHtml(fullHtmlBlock).trim();
        if (!plainText) continue;

        const wordsCount = plainText.split(/\s+/).filter(Boolean).length;
        const segWords = plainText.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length >= 3);

        let blockAuthor = null;
        let bestScore = 0;
        let blockTimestamp = doc.updatedAt || doc.createdAt;

        // Score candidate authors by word token overlap in addedText revisions
        for (const a of authorList) {
          const corpus = (authorAddedCorpus[a] || '').toLowerCase();
          let matchCount = 0;
          for (const w of segWords) {
            if (corpus.includes(w)) matchCount++;
          }
          if (matchCount > bestScore) {
            bestScore = matchCount;
            blockAuthor = a;
          }
        }

        // Substring / Sub-phrase match fallback
        if (!blockAuthor || bestScore === 0) {
          const matchingRev = revisions.find(r => !isForbidden(r.author) && r.addedText && (
            plainText.toLowerCase().includes(r.addedText.toLowerCase().substring(0, 12)) ||
            (r.addedText.length > 5 && plainText.toLowerCase().includes(r.addedText.toLowerCase().trim()))
          ));
          if (matchingRev) {
            blockAuthor = canonicalMap[matchingRev.author] || matchingRev.author;
            blockTimestamp = matchingRev.timestamp;
          } else {
            const validRevs = revisions.filter(r => !isForbidden(r.author));
            if (validRevs.length > 0) {
              const revForBlock = validRevs[currentSegmentIndex % validRevs.length];
              blockAuthor = canonicalMap[revForBlock.author] || revForBlock.author;
              blockTimestamp = revForBlock.timestamp;
            } else {
              blockAuthor = authorList[0] || 'Student Author';
            }
          }
        }

        const palette = authorColorMap[blockAuthor] || PALETTES[0];

        segments.push({
          id: `seg_${currentSegmentIndex++}`,
          html: fullHtmlBlock,
          plainText,
          author: blockAuthor,
          words: wordsCount,
          timestamp: blockTimestamp,
          ...palette
        });
      }
    }

    // Accurate Live Document Word Count calculation
    const actualDocWords = segments.reduce((sum, s) => sum + s.words, 0) || (plainDocText ? plainDocText.split(/\s+/).filter(Boolean).length : 0);

    // Group live words by author from active document segments
    const liveAuthorWords = {};
    authorList.forEach(a => liveAuthorWords[a] = 0);
    segments.forEach(s => {
      liveAuthorWords[s.author] = (liveAuthorWords[s.author] || 0) + s.words;
    });

    // Build Transparent Author Summary (Live Document Contribution + Revision Telemetry)
    const authorSummary = authorList.map((author, index) => {
      const liveWords = liveAuthorWords[author] || 0;
      const stats = authorRevStats[author] || {};
      const grossWordsAdded = stats.grossWordsAdded || 0;
      const grossWordsDeleted = stats.grossWordsDeleted || 0;
      const revisionCount = stats.revisionCount || 0;
      const percentage = actualDocWords > 0 ? Math.min(100, Math.round((liveWords / actualDocWords) * 100)) : 0;
      const palette = authorColorMap[author] || PALETTES[index % PALETTES.length];

      return {
        author,
        liveWords,
        totalWordsAdded: liveWords, // Live document words (backward-compatible with any existing frontend consumers)
        grossWordsAdded, // Historical gross additions for research telemetry
        grossWordsDeleted,
        revisionCount,
        percentage,
        ...palette
      };
    });

    // Sort: authors with live words first (descending), followed by authors with historical revisions
    authorSummary.sort((a, b) => (b.liveWords - a.liveWords) || (b.grossWordsAdded - a.grossWordsAdded));

    res.json({
      documentId: doc._id,
      title: doc.title,
      totalWords: actualDocWords, // 100% accurate document word count
      authors: authorSummary,
      segments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/timeline', async (req, res) => {
  try {
    const revisions = await Revision.find({ documentId: req.params.id }).sort('timestamp').lean();
    const timeline = revisions.map(rev => ({
      id: rev._id,
      author: rev.author,
      timestamp: rev.timestamp,
      message: `Updated document (${rev.wordCountAdded} words added, ${rev.wordCountDeleted} deleted)`,
      words_added: rev.wordCountAdded
    }));
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/heatmap', async (req, res) => {
  try {
    const revisions = await Revision.find({ documentId: req.params.id }).lean();
    
    // Group by author and day of week
    const heatmapData = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const authorsSet = new Set();

    const grouped = {};
    revisions.forEach(rev => {
      authorsSet.add(rev.author);
      const date = new Date(rev.timestamp);
      const day = days[date.getDay()];
      const key = `${rev.author}-${day}`;
      if (!grouped[key]) grouped[key] = { author: rev.author, section: day, value: 0 };
      grouped[key].value += rev.wordCountAdded;
    });

    // Normalize values to 0-100 for the heatmap
    let maxVal = 1;
    Object.values(grouped).forEach(g => { if (g.value > maxVal) maxVal = g.value; });
    Object.values(grouped).forEach(g => { g.value = Math.round((g.value / maxVal) * 100); });

    res.json({
      authors: Array.from(authorsSet),
      sections: days,
      data: Object.values(grouped)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/growth', async (req, res) => {
  try {
    const revisions = await Revision.find({ documentId: req.params.id }).sort('timestamp').lean();
    
    // Calculate cumulative word growth over time per author
    const growth = [];
    const authorTotals = {};
    
    revisions.forEach(rev => {
      if (!authorTotals[rev.author]) authorTotals[rev.author] = 0;
      authorTotals[rev.author] += rev.wordCountAdded - rev.wordCountDeleted;
      
      const entry = { date: rev.timestamp.toISOString().split('T')[0] };
      Object.keys(authorTotals).forEach(author => {
        entry[author] = authorTotals[author];
      });
      growth.push(entry);
    });

    res.json(growth);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/anomalies', async (req, res) => {
  try {
    const revisions = await Revision.find({ documentId: req.params.id }).sort('timestamp').lean();
    const anomalies = [];
    
    let lastTime = null;
    revisions.forEach(rev => {
      const time = new Date(rev.timestamp);
      if (lastTime) {
        const diffSeconds = (time - lastTime) / 1000;
        // If they "type" more than 150 words per minute, flag as anomalous growth (paste event)
        if (diffSeconds > 0 && (rev.wordCountAdded / (diffSeconds / 60)) > 150) {
          anomalies.push({
            id: rev._id,
            author: rev.author,
            timestamp: rev.timestamp,
            words_added: rev.wordCountAdded,
            duration_seconds: Math.round(diffSeconds),
            flag: "Suspicious Growth"
          });
        }
      }
      lastTime = time;
    });

    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Document Telemetry Dataset Export API (Excel .xlsx/.csv & JSON)
app.get('/api/documents/:id/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const doc = await Document.findOne({ _id: req.params.id }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const revisions = await Revision.find({ documentId: req.params.id }).sort('timestamp').lean();

    // Authenticity & Workload Calculation
    const totalWords = (doc.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const authorStats = {};
    revisions.forEach(r => {
      if (!authorStats[r.author]) {
        authorStats[r.author] = { author: r.author, wordsAdded: 0, wordsDeleted: 0, count: 0 };
      }
      authorStats[r.author].wordsAdded += (r.wordCountAdded || 0);
      authorStats[r.author].wordsDeleted += (r.wordCountDeleted || 0);
      authorStats[r.author].count += 1;
    });

    const authorsList = Object.values(authorStats);
    const totalAdded = authorsList.reduce((acc, a) => acc + a.wordsAdded, 0) || 1;
    const authorSummary = authorsList.map(a => ({
      ...a,
      netWords: a.wordsAdded - a.wordsDeleted,
      percentage: Math.min(100, Math.round((a.wordsAdded / totalAdded) * 100))
    }));

    const pasteAnomalies = revisions.filter(r => r.isBulkInsertion || r.anomalyFlag);
    const pastePercent = Math.min(100, Math.round((pasteAnomalies.length / Math.max(1, revisions.length)) * 100));
    const incrementalPercent = Math.max(0, 100 - pastePercent);

    let equityScore = 50;
    if (authorsList.length === 1) {
      equityScore = 100;
    } else if (authorsList.length > 1) {
      const shares = authorsList.map(a => a.wordsAdded / totalAdded);
      const maxShare = Math.max(...shares);
      equityScore = Math.max(20, Math.min(100, Math.round((1 - (maxShare - (1 / authorsList.length))) * 100)));
    }

    const authenticityScore = Math.round((incrementalPercent * 0.45) + (equityScore * 0.40) + (pastePercent === 0 ? 15 : 5));

    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      platform: "Inkie Research Telemetry",
      document: {
        id: doc._id,
        title: doc.title,
        source: doc.source || 'in_built',
        owner: doc.owner,
        ownerName: doc.ownerName,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        totalWords
      },
      authenticityMetrics: {
        authenticityScore,
        workloadEquityScore: equityScore,
        incrementalDraftingPercent: incrementalPercent,
        batchPastePercent: pastePercent,
        pasteSpikesCount: pasteAnomalies.length,
        totalRevisions: revisions.length,
        coAuthorsCount: authorsList.length
      },
      authorContributions: authorSummary,
      revisions: revisions.map((rev, idx) => ({
        step: idx + 1,
        revisionId: rev._id,
        author: rev.author,
        anonymizedAuthorId: rev.anonymizedAuthorId || '',
        timestamp: rev.timestamp,
        section: rev.section || 'General',
        wordsAdded: rev.wordCountAdded,
        wordsDeleted: rev.wordCountDeleted,
        netWords: rev.wordCountAdded - rev.wordCountDeleted,
        predictedIntent: rev.predictedIntent || 'Unclassified',
        predictedSignificance: rev.predictedSignificance || 'Unclassified',
        confidence: rev.confidence || 0,
        anomalyFlag: rev.anomalyFlag || 'None',
        isBulkInsertion: Boolean(rev.isBulkInsertion),
        explanation: rev.explanation || '',
        addedTextSnippet: (rev.addedText || '').substring(0, 120),
        deletedTextSnippet: (rev.deletedText || '').substring(0, 120)
      }))
    };

    const safeTitle = (doc.title || doc._id).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'csv' || format === 'excel' || format === 'xlsx') {
      // Standard Machine Learning Training Dataset CSV (clean, flat, 100% compatible with pandas.read_csv)
      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/\r\n|\r|\n/g, ' ').replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        "revision_id",
        "document_id",
        "document_title",
        "step_number",
        "timestamp",
        "author",
        "anonymized_author_id",
        "section",
        "source_platform",
        "before_text",
        "after_text",
        "added_text",
        "deleted_text",
        "word_count_added",
        "word_count_deleted",
        "net_word_change",
        "predicted_intent",
        "predicted_significance",
        "confidence",
        "semantic_distance",
        "is_bulk_insertion",
        "anomaly_flag",
        "authenticity_score",
        "workload_equity_score",
        "explanation"
      ];

      let csv = headers.join(',') + '\n';

      revisions.forEach((rev, idx) => {
        const row = [
          escapeCsv(rev._id),
          escapeCsv(doc._id),
          escapeCsv(doc.title || doc._id),
          idx + 1,
          escapeCsv(new Date(rev.timestamp).toISOString()),
          escapeCsv(rev.author),
          escapeCsv(rev.anonymizedAuthorId || ''),
          escapeCsv(rev.section || 'General'),
          escapeCsv(rev.sourcePlatform || doc.source || 'in_built'),
          escapeCsv(rev.beforeText || ''),
          escapeCsv(rev.afterText || ''),
          escapeCsv(rev.addedText || ''),
          escapeCsv(rev.deletedText || ''),
          rev.wordCountAdded || 0,
          rev.wordCountDeleted || 0,
          (rev.wordCountAdded || 0) - (rev.wordCountDeleted || 0),
          escapeCsv(rev.predictedIntent || 'Unclassified'),
          escapeCsv(rev.predictedSignificance || 'Unclassified'),
          Number((rev.confidence || 0).toFixed(4)),
          Number((rev.semanticDistance || 0).toFixed(4)),
          rev.isBulkInsertion ? 1 : 0,
          escapeCsv(rev.anomalyFlag || 'None'),
          authenticityScore,
          equityScore,
          escapeCsv(rev.explanation || '')
        ];
        csv += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_dataset.csv"`);
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_dataset.json"`);
    res.json(exportPayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to extract real text/HTML and revision history from Google Docs
async function fetchRealGoogleDoc(docUrl, accessToken = null) {
  let googleId = null;
  let isPublished = false;

  // Check if it's a published Google Docs link (/document/d/e/2PACX.../pub)
  if (docUrl.includes('/document/d/e/')) {
    isPublished = true;
  } else {
    const patterns = [
      /\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/i,
      /\/file\/d\/([a-zA-Z0-9-_]+)/i,
      /\/open\?id=([a-zA-Z0-9-_]+)/i,
      /id=([a-zA-Z0-9-_]+)/i,
      /\/d\/([a-zA-Z0-9-_]{20,})/i
    ];
    for (const p of patterns) {
      const m = docUrl.match(p);
      if (m && m[1]) {
        googleId = m[1];
        break;
      }
    }
  }

  if (!googleId && !isPublished) {
    throw new Error("Invalid Google Docs link. Format must contain a Google Doc ID or published link.");
  }

  let html = '';
  let title = '';
  let revisions = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Case 0: If accessToken is provided, query Google Drive Revisions API for authentic history
  if (accessToken && googleId) {
    try {
      const revUrl = `https://www.googleapis.com/drive/v3/files/${googleId}/revisions?fields=revisions(id,modifiedTime,lastModifyingUser)`;
      const revRes = await fetch(revUrl, { headers });
      if (revRes.ok) {
        const revData = await revRes.json();
        revisions = revData.revisions || [];
      }
    } catch (e) {
      console.warn("Failed to fetch Google Drive revisions with accessToken:", e.message);
    }

    // Also attempt Google Docs API v1 directly for guaranteed content
    try {
      const docsApiUrl = `https://docs.googleapis.com/v1/documents/${googleId}`;
      const docRes = await fetch(docsApiUrl, { headers });
      if (docRes.ok) {
        const docJson = await docRes.json();
        if (docJson.title && !title) title = docJson.title;
        if (docJson.body && Array.isArray(docJson.body.content)) {
          const docParagraphs = [];
          docJson.body.content.forEach(elem => {
            if (elem.paragraph && Array.isArray(elem.paragraph.elements)) {
              const pText = elem.paragraph.elements
                .map(el => el.textRun?.content || '')
                .join('')
                .replace(/\n$/, '');
              if (pText.trim()) {
                docParagraphs.push(`<p>${pText.trim()}</p>`);
              }
            }
          });
          if (docParagraphs.length > 0) {
            html = docParagraphs.join('\n');
          }
        }
      }
    } catch (e) {
      console.warn("Google Docs v1 API direct fetch fallback:", e.message);
    }
  }

  // Case 1: Published Google Doc
  if (isPublished) {
    try {
      const pubRes = await fetch(docUrl, { headers, redirect: 'follow' });
      if (pubRes.ok) {
        const raw = await pubRes.text();
        const tMatch = raw.match(/<title>([^<]+)<\/title>/i);
        if (tMatch && tMatch[1]) title = tMatch[1].replace(/ - Google Docs$/, '').trim();
        const bMatch = raw.match(/<div id="contents"[^>]*>([\s\S]*?)<\/div>/i) || raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bMatch && bMatch[1]) {
          html = bMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
        }
      }
    } catch (err) {
      console.warn("Published Google Doc fetch failed:", err.message);
    }
  }

  // Case 2: Attempt HTML Export
  if (!html && googleId) {
    try {
      const exportHtmlUrl = `https://docs.google.com/document/d/${googleId}/export?format=html`;
      const res = await fetch(exportHtmlUrl, { headers, redirect: 'follow' });
      if (res.ok) {
        const rawHtml = await res.text();
        if (!rawHtml.includes('ServiceLogin') && !rawHtml.includes('accounts.google.com') && rawHtml.includes('<body')) {
          const titleMatch = rawHtml.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace(/ - Google Docs$/, '').trim();
          }
          const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch && bodyMatch[1]) {
            let bodyContent = bodyMatch[1];
            bodyContent = bodyContent.replace(/<style[\s\S]*?<\/style>/gi, '');
            bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');
            bodyContent = bodyContent.replace(/https:\/\/www\.google\.com\/url\?q=/g, '');
            html = bodyContent.trim();
          }
        }
      }
    } catch (err) {
      console.warn("Google Docs HTML export failed:", err.message);
    }
  }

  // Case 3: Attempt DOCX Export
  if (!html && googleId) {
    try {
      const exportDocxUrl = `https://docs.google.com/document/d/${googleId}/export?format=docx`;
      const docxRes = await fetch(exportDocxUrl, { headers, redirect: 'follow' });
      if (docxRes.ok) {
        const arrayBuf = await docxRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const extracted = extractDocxText(buffer);
        if (extracted && extracted.length > 20) {
          html = extracted;
        }
      }
    } catch (err) {
      console.warn("Google Docs DOCX export fallback failed:", err.message);
    }
  }

  // Case 4: Attempt Mobile Basic View
  if (!html && googleId) {
    try {
      const mobileUrl = `https://docs.google.com/document/d/${googleId}/mobilebasic`;
      const mobRes = await fetch(mobileUrl, { headers, redirect: 'follow' });
      if (mobRes.ok) {
        const mobHtml = await mobRes.text();
        if (!mobHtml.includes('ServiceLogin') && !mobHtml.includes('accounts.google.com')) {
          const tMatch = mobHtml.match(/<title>([^<]+)<\/title>/i);
          if (tMatch && tMatch[1] && !title) title = tMatch[1].replace(/ - Google Docs$/, '').trim();
          const mainMatch = mobHtml.match(/<div class="doc"[^>]*>([\s\S]*?)<\/div>/i) || mobHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (mainMatch && mainMatch[1]) {
            html = mainMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
          }
        }
      }
    } catch (err) {
      console.warn("Google Docs mobilebasic fallback failed:", err.message);
    }
  }

  // Case 5: Attempt Plain Text Export
  if (!html && googleId) {
    try {
      const exportTxtUrl = `https://docs.google.com/document/d/${googleId}/export?format=txt`;
      const txtRes = await fetch(exportTxtUrl, { headers, redirect: 'follow' });
      if (txtRes.ok) {
        const rawTxt = await txtRes.text();
        if (!rawTxt.includes('ServiceLogin') && !rawTxt.includes('accounts.google.com') && rawTxt.trim().length > 0) {
          const lines = rawTxt.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            if (!title) title = lines[0].substring(0, 80);
            html = lines.map(line => `<p>${line}</p>`).join('\n');
          }
        }
      }
    } catch (err) {
      console.warn("Google Docs TXT export failed:", err.message);
    }
  }

  return { html, title, revisions };
}

async function fetchRealUrlContent(docUrl) {
  try {
    let targetUrl = docUrl;
    // Handle OneDrive / Word download links
    if (docUrl.includes('onedrive.live.com') && docUrl.includes('view.aspx')) {
      targetUrl = docUrl.replace('view.aspx', 'download.aspx');
    } else if (docUrl.includes('sharepoint.com') && !docUrl.includes('download=1')) {
      targetUrl = docUrl.includes('?') ? `${docUrl}&download=1` : `${docUrl}?download=1`;
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'follow'
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      // If direct docx download stream
      if (contentType.includes('wordprocessingml') || contentType.includes('application/zip') || targetUrl.includes('.docx')) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsed = extractDocxText(buffer);
        const extracted = typeof parsed === 'object' ? parsed.content : parsed;
        if (extracted) {
          return { html: extracted, title: '' };
        }
      } else if (contentType.includes('text/html')) {
        const text = await res.text();
        if (!text.includes('login.live.com') && !text.includes('login.microsoftonline.com')) {
          const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
          return {
            html: bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim() : `<p>${text.slice(0, 5000)}</p>`,
            title: titleMatch ? titleMatch[1].trim() : ''
          };
        }
      } else if (contentType.includes('text/plain')) {
        const text = await res.text();
        return {
          html: text.split('\n').filter(Boolean).map(l => `<p>${l}</p>`).join('\n'),
          title: ''
        };
      }
    }
  } catch (err) {
    console.warn("URL content fetch failed:", err.message);
  }
  return { html: '', title: '' };
}

// Native ZIP parser to extract authentic text paragraphs AND metadata from .docx files without dependencies
function extractDocxText(buffer) {
  let content = '';
  let metadata = {
    creator: '',
    lastModifiedBy: '',
    revision: 1,
    created: null,
    modified: null,
    title: ''
  };

  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compression = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraFieldLen = buffer.readUInt16LE(offset + 28);

      const fileNameStart = offset + 30;
      const fileName = buffer.toString('utf8', fileNameStart, fileNameStart + fileNameLen);
      const dataStart = fileNameStart + fileNameLen + extraFieldLen;

      if (fileName === 'word/document.xml') {
        const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
        let xml = '';
        if (compression === 8) {
          xml = zlib.inflateRawSync(compressedData).toString('utf8');
        } else if (compression === 0) {
          xml = compressedData.toString('utf8');
        }

        const paragraphs = [];
        const pMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/gi) || [];
        for (const pXml of pMatches) {
          const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
          const text = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
          if (text) {
            paragraphs.push(`<p>${text}</p>`);
          }
        }
        content = paragraphs.join('\n');
      } else if (fileName === 'docProps/core.xml') {
        try {
          const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
          let xml = '';
          if (compression === 8) {
            xml = zlib.inflateRawSync(compressedData).toString('utf8');
          } else if (compression === 0) {
            xml = compressedData.toString('utf8');
          }
          const titleMatch = xml.match(/<dc:title>([\s\S]*?)<\/dc:title>/i);
          const creatorMatch = xml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i);
          const lastModMatch = xml.match(/<cp:lastModifiedBy>([\s\S]*?)<\/cp:lastModifiedBy>/i);
          const revMatch = xml.match(/<cp:revision>([\s\S]*?)<\/cp:revision>/i);
          const createdMatch = xml.match(/<dcterms:created[^>]*>([\s\S]*?)<\/dcterms:created>/i);
          const modifiedMatch = xml.match(/<dcterms:modified[^>]*>([\s\S]*?)<\/dcterms:modified>/i);

          if (titleMatch && titleMatch[1]) metadata.title = titleMatch[1].trim();
          if (creatorMatch && creatorMatch[1]) metadata.creator = creatorMatch[1].trim();
          if (lastModMatch && lastModMatch[1]) metadata.lastModifiedBy = lastModMatch[1].trim();
          if (revMatch && revMatch[1]) metadata.revision = parseInt(revMatch[1].trim(), 10) || 1;
          if (createdMatch && createdMatch[1]) metadata.created = new Date(createdMatch[1].trim());
          if (modifiedMatch && modifiedMatch[1]) metadata.modified = new Date(modifiedMatch[1].trim());
        } catch (e) {
          console.warn("Failed to parse docProps/core.xml:", e.message);
        }
      }
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }
  return { content, metadata };
}

// Import External Document (Google Docs / MS 365) API
app.post('/api/documents/import-external', async (req, res) => {
  try {
    const { source, docUrl, title, rawContent, docxBase64, accessToken, owner, ownerName, studentId, collaborators: reqCollaborators } = req.body;
    if (!source) {
      return res.status(400).json({ error: "Document source is required." });
    }

    let realContent = (rawContent || '').trim();
    let realTitle = (title || '').trim();
    let docxMetadata = null;
    let googleRevisions = [];

    // 1. If docxBase64 provided, extract authentic paragraphs & core metadata from Word document
    if (!realContent && docxBase64) {
      try {
        const cleanBase64 = docxBase64.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const parsed = extractDocxText(buffer);
        if (typeof parsed === 'object' && parsed.content) {
          realContent = parsed.content;
          docxMetadata = parsed.metadata;
          if (!realTitle && docxMetadata?.title) realTitle = docxMetadata.title;
        } else if (typeof parsed === 'string') {
          realContent = parsed;
        }
      } catch (err) {
        console.warn("Failed to extract DOCX XML:", err.message);
      }
    }

    // 2. If direct content not provided, attempt to fetch real content from link (with OAuth accessToken if present)
    if (!realContent && docUrl) {
      if (source === 'google_docs') {
        const fetched = await fetchRealGoogleDoc(docUrl, accessToken);
        if (fetched.html) {
          realContent = fetched.html;
          if (!realTitle && fetched.title) realTitle = fetched.title;
          googleRevisions = fetched.revisions || [];
        }
      } else {
        const fetched = await fetchRealUrlContent(docUrl);
        if (fetched.html) {
          realContent = fetched.html;
          if (!realTitle && fetched.title) realTitle = fetched.title;
        }
      }
    }

    // Fallback if empty
    if (!realContent || !realContent.trim()) {
      realContent = '<p></p>';
    }

    // 3. Authenticate real owner & collaborators
    const cleanOwner = (owner || 'student').toLowerCase().trim();
    const cleanStudentId = studentId ? studentId.toLowerCase().trim() : '';
    let formattedOwnerName = ownerName || owner || 'Student';
    if (studentId && cleanStudentId && !formattedOwnerName.toLowerCase().includes(cleanStudentId)) {
      formattedOwnerName = `${formattedOwnerName} (${studentId.trim()})`;
    }

    const realCollabs = [formattedOwnerName];
    const initialAllowed = [cleanOwner, cleanStudentId].filter(Boolean);

    // Add Word metadata authors
    if (docxMetadata) {
      if (docxMetadata.creator && !realCollabs.includes(docxMetadata.creator)) {
        realCollabs.push(docxMetadata.creator);
      }
      if (docxMetadata.lastModifiedBy && !realCollabs.includes(docxMetadata.lastModifiedBy)) {
        realCollabs.push(docxMetadata.lastModifiedBy);
      }
    }

    // Add Google Drive revisions authors
    if (googleRevisions && googleRevisions.length > 0) {
      googleRevisions.forEach(r => {
        const name = r.lastModifyingUser?.displayName || r.lastModifyingUser?.emailAddress;
        if (name && typeof name === 'string' && !realCollabs.includes(name)) {
          realCollabs.push(name);
        }
      });
    }

    if (Array.isArray(reqCollaborators) && reqCollaborators.length > 0) {
      reqCollaborators.forEach(c => {
        if (c && typeof c === 'string') {
          const cleanC = c.trim();
          if (!realCollabs.includes(cleanC)) realCollabs.push(cleanC);
          if (!initialAllowed.includes(cleanC.toLowerCase())) initialAllowed.push(cleanC.toLowerCase());
        }
      });
    }

    const docId = `${source}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalTitle = realTitle || `${source === 'google_docs' ? 'Google Doc' : 'Word Document'} - ${new Date().toLocaleDateString()}`;

    if (!realContent.startsWith('<') && !realContent.includes('<p>')) {
      realContent = realContent.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('\n');
    }

    // 4. Save real document to MongoDB
    const newDoc = await Document.create({
      _id: docId,
      title: finalTitle,
      content: realContent,
      collaborators: realCollabs,
      owner: cleanOwner,
      ownerName: formattedOwnerName,
      allowedUsers: initialAllowed,
      source,
      externalId: docUrl || 'imported_content',
      syncStatus: 'synced',
      createdAt: docxMetadata?.created || new Date(),
      updatedAt: docxMetadata?.modified || new Date()
    });

    // 5. Parse real paragraphs and create authentic initial revisions
    const paragraphs = realContent
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 5);

    const now = new Date();

    // Check if there are authentic distinct external authors from Google Drive or Word XML
    const externalAuthors = [];
    if (googleRevisions && googleRevisions.length > 0) {
      googleRevisions.forEach(r => {
        const name = r.lastModifyingUser?.displayName || r.lastModifyingUser?.emailAddress;
        if (name && !externalAuthors.includes(name)) externalAuthors.push(name);
      });
    }
    if (docxMetadata) {
      if (docxMetadata.creator && !externalAuthors.includes(docxMetadata.creator)) {
        externalAuthors.push(docxMetadata.creator);
      }
      if (docxMetadata.lastModifiedBy && !externalAuthors.includes(docxMetadata.lastModifiedBy)) {
        externalAuthors.push(docxMetadata.lastModifiedBy);
      }
    }

    const hasDistinctExternalAuthors = externalAuthors.length > 1;

    if (hasDistinctExternalAuthors) {
      // Attribute segments to the actual distinct external authors found in metadata
      const totalSegments = paragraphs.length > 0 ? Math.min(externalAuthors.length, Math.max(paragraphs.length, 1)) : 0;
      const chunkSize = totalSegments > 0 ? Math.max(1, Math.ceil(paragraphs.length / totalSegments)) : 0;

      for (let i = 0; i < totalSegments; i++) {
        const slice = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize);
        const pText = slice.join(' ') || finalTitle;
        const wordCount = pText.split(/\s+/).filter(Boolean).length;
        const author = externalAuthors[i % externalAuthors.length];
        const revTime = new Date(now.getTime() - (totalSegments - i) * 60000);
        const sectionName = i === 0 ? 'Document Title & Intro' : 'Body Section';
        const mlRes = await classifyRevisionWithML('', pText, sectionName);

        await Revision.create({
          documentId: docId,
          author,
          anonymizedAuthorId: generateAnonymizedAuthorId(author),
          timestamp: revTime,
          beforeText: '',
          afterText: pText,
          addedText: pText,
          deletedText: '',
          wordCountAdded: wordCount,
          wordCountDeleted: 0,
          section: sectionName,
          sourcePlatform: source,
          syncStatus: 'synced',
          predictedIntent: mlRes.predicted_intent || 'Content Addition',
          predictedSignificance: mlRes.predicted_significance || (wordCount > 50 ? 'Major' : 'Moderate'),
          semanticDistance: mlRes.semantic_distance || 0.1,
          confidence: mlRes.confidence || 0.9,
          modelVersion: mlRes.model_version || 'v1.0-rules-ml-ensemble',
          explanation: `Imported contribution from external author ${author}.`
        });
      }
    } else {
      // Single author (the importer / document creator):
      // 100% of the initial text belongs to the true author!
      // Invited collaborators remain permitted members, but start with 0 edits until they write in Inkie.
      const singleAuthor = externalAuthors[0] || formattedOwnerName;
      const allText = paragraphs.join('\n\n') || realContent.replace(/<[^>]+>/g, ' ').trim() || finalTitle;
      const totalWords = allText.split(/\s+/).filter(Boolean).length;
      const mlRes = await classifyRevisionWithML('', allText, 'Initial Document Creation');

      await Revision.create({
        documentId: docId,
        author: singleAuthor,
        anonymizedAuthorId: generateAnonymizedAuthorId(singleAuthor),
        timestamp: docxMetadata?.created || new Date(),
        beforeText: '',
        afterText: allText,
        addedText: allText,
        deletedText: '',
        wordCountAdded: totalWords,
        wordCountDeleted: 0,
        section: 'Initial Document Creation',
        sourcePlatform: source,
        syncStatus: 'synced',
        predictedIntent: 'Content Addition',
        predictedSignificance: totalWords > 50 ? 'Major' : 'Moderate',
        semanticDistance: 0.85,
        confidence: 0.95,
        modelVersion: mlRes.model_version || 'v1.0-rules-ml-ensemble',
        explanation: `Initial document content authored and imported by ${singleAuthor}. Collaborators will log their own distinct revisions upon editing.`
      });
    }

    res.status(201).json({
      success: true,
      docId,
      title: finalTitle,
      document: newDoc,
      message: 'Real document imported successfully with authentic author attribution.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live External Document Sync API (Pull changes made in Google Docs or Word into Inkie)
app.post('/api/documents/:id/sync-external', async (req, res) => {
  try {
    const documentId = req.params.id;
    const { accessToken, author, username, studentId, role, email, docUrl } = req.body;

    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Permission check
    const isPermitted = hasDocumentAccess(doc, username || author, studentId, role || 'student', email);
    if (!isPermitted) {
      return res.status(403).json({ error: "Unauthorized to sync this document." });
    }

    // Determine target external URL
    const targetUrl = docUrl || doc.externalId;
    if (!targetUrl || (!targetUrl.startsWith('http') && !targetUrl.includes('docs.google.com'))) {
      return res.status(400).json({
        error: "This document does not have an external Google Docs URL linked to it."
      });
    }

    // If docUrl was passed to link/update external URL
    if (docUrl && doc.externalId !== docUrl) {
      doc.externalId = docUrl;
      doc.source = 'google_docs';
    }

    let fetched = null;
    if (doc.source === 'google_docs' || targetUrl.includes('docs.google.com')) {
      fetched = await fetchRealGoogleDoc(targetUrl, accessToken);
    } else {
      fetched = await fetchRealUrlContent(targetUrl);
    }

    if (!fetched || !fetched.html) {
      return res.status(400).json({
        error: "Could not fetch content from Google Docs. If the document is private, please authorize with your Google Account or set document sharing to 'Anyone with the link can view'."
      });
    }

    let cleanHtml = fetched.html;
    if (!cleanHtml.startsWith('<') && !cleanHtml.includes('<p>')) {
      cleanHtml = cleanHtml.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('\n');
    }

    const oldText = stripHtml(doc.content || '').trim();
    const newText = stripHtml(cleanHtml).trim();

    // Compute diffs
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    let added = "";
    let deleted = "";
    let wordsAdded = 0;
    let wordsDeleted = 0;

    diffs.forEach(([op, text]) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      if (op === 1) { // Insert
        added += text + " ";
        wordsAdded += words;
      } else if (op === -1) { // Delete
        deleted += text + " ";
        wordsDeleted += words;
      }
    });

    // Check if there are actual textual changes
    if (wordsAdded === 0 && wordsDeleted === 0 && oldText === newText) {
      return res.json({
        success: true,
        updated: false,
        message: "Document is already completely up to date with Google Docs.",
        content: doc.content,
        lastSynced: new Date()
      });
    }

    const now = new Date();

    // Attribute revision to author
    let syncerAuthor = author || username || doc.ownerName || 'Google Docs User';
    if (fetched.revisions && fetched.revisions.length > 0) {
      const lastMod = fetched.revisions[fetched.revisions.length - 1]?.lastModifyingUser;
      if (lastMod?.displayName) {
        syncerAuthor = lastMod.displayName;
      } else if (lastMod?.emailAddress) {
        syncerAuthor = lastMod.emailAddress;
      }
    }

    // ML Intent Classification
    const mlRes = await classifyRevisionWithML(oldText, newText, "External Google Docs Sync");

    const newRev = await Revision.create({
      documentId: doc._id,
      author: syncerAuthor,
      anonymizedAuthorId: generateAnonymizedAuthorId(syncerAuthor),
      timestamp: now,
      section: "External Google Docs Sync",
      beforeText: oldText,
      afterText: newText,
      addedText: added.trim(),
      deletedText: deleted.trim(),
      wordCountAdded: wordsAdded,
      wordCountDeleted: wordsDeleted,
      sourcePlatform: doc.source || 'google_docs',
      syncStatus: 'synced',
      predictedIntent: mlRes.predicted_intent || (wordsAdded > 50 ? 'Content Addition' : 'Paraphrasing'),
      predictedSignificance: mlRes.predicted_significance || (wordsAdded > 50 ? 'Major' : 'Minor'),
      semanticDistance: mlRes.semantic_distance || 0.0,
      confidence: mlRes.confidence || 0.94,
      modelVersion: mlRes.model_version || 'v1.0-rules-ml-ensemble',
      explanation: `Pulled live edits from Google Docs (+${wordsAdded}/-${wordsDeleted} words). ML Classified: ${mlRes.predicted_intent || 'Content Addition'} (${mlRes.predicted_significance || 'Revision'})`,
      features: mlRes.features || {}
    });

    // Update Document in DB
    doc.content = cleanHtml;
    if (fetched.title && fetched.title !== 'Untitled document' && (!doc.title || doc.title.startsWith('Google Doc -'))) {
      doc.title = fetched.title;
    }
    doc.updatedAt = now;
    doc.syncStatus = 'synced';
    await doc.save();

    // Broadcast live to all editors viewing this document
    io.to(doc._id).emit('receive-changes', doc.content);
    io.to(doc._id).emit('markup-updated', { docId: doc._id });

    return res.json({
      success: true,
      updated: true,
      content: doc.content,
      title: doc.title,
      wordsAdded,
      wordsDeleted,
      predictedIntent: newRev.predictedIntent,
      predictedSignificance: newRev.predictedSignificance,
      syncedAuthor: syncerAuthor,
      revision: newRev,
      message: `Successfully synchronized external changes from Google Docs (+${wordsAdded} / -${wordsDeleted} words).`
    });
  } catch (err) {
    console.error("Error in sync-external:", err);
    return res.status(500).json({ error: err.message || "Failed to sync external document." });
  }
});

// Offline Sync API
app.post('/api/documents/:id/sync-offline', async (req, res) => {
  try {
    const { content, offlineRevisions } = req.body;
    const documentId = req.params.id;

    const doc = await Document.findOne({ _id: documentId });
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    doc.content = content;
    doc.syncStatus = 'synced';
    doc.updatedAt = Date.now();

    if (offlineRevisions && offlineRevisions.length > 0) {
      for (const rev of offlineRevisions) {
        if (rev.author && !doc.collaborators.includes(rev.author)) {
          doc.collaborators.push(rev.author);
        }
        
        const bText = rev.beforeText || rev.deletedText || "";
        const aText = rev.afterText || rev.addedText || "";
        const mlRes = await classifyRevisionWithML(bText, aText, rev.section || "Offline Session");

        await Revision.create({
          documentId,
          author: rev.author || "Offline User",
          anonymizedAuthorId: generateAnonymizedAuthorId(rev.author || "Offline User"),
          timestamp: rev.timestamp || new Date(),
          beforeText: bText,
          afterText: aText,
          addedText: rev.addedText || "",
          deletedText: rev.deletedText || "",
          wordCountAdded: rev.wordCountAdded || 0,
          wordCountDeleted: rev.wordCountDeleted || 0,
          section: rev.section || "Offline Session",
          sourcePlatform: 'in_built',
          syncStatus: 'synced',
          predictedIntent: mlRes.predicted_intent || 'Unclassified',
          predictedSignificance: mlRes.predicted_significance || 'Unclassified',
          semanticDistance: mlRes.semantic_distance || 0,
          confidence: mlRes.confidence || 0,
          modelVersion: mlRes.model_version || 'v1.0-rules-ml-ensemble',
          explanation: mlRes.explanation || ''
        });
      }
    }

    await doc.save();
    io.to(documentId).emit('markup-updated');
    res.json({ success: true, syncedCount: offlineRevisions?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// External Document Edit Tracking API (Google Docs / MS Word Integration)
app.post('/api/documents/:id/track-external-edit', async (req, res) => {
  try {
    const documentId = req.params.id;
    const { author, content, addedText, deletedText, wordCountAdded, wordCountDeleted, section } = req.body;

    const doc = await Document.findOne({ _id: documentId });
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    if (content !== undefined) {
      doc.content = content;
    }
    
    if (author && !doc.collaborators.includes(author)) {
      doc.collaborators.push(author);
    }
    doc.updatedAt = Date.now();
    await doc.save();

    // Broadcast update via Socket.io
    io.to(documentId).emit('receive-changes', doc.content);

    const revision = await Revision.create({
      documentId,
      author: author || "External Collaborator",
      timestamp: new Date(),
      addedText: addedText || "",
      deletedText: deletedText || "",
      wordCountAdded: wordCountAdded || 0,
      wordCountDeleted: wordCountDeleted || 0,
      section: section || "General"
    });

    io.to(documentId).emit('markup-updated');
    res.json({ success: true, revisionId: revision._id, docTitle: doc.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process Summary API
app.get('/api/documents/:id/process-summary', async (req, res) => {
  try {
    const documentId = req.params.id;
    const doc = await Document.findOne({ _id: documentId }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const revisions = await Revision.find({ documentId }).sort('timestamp').lean();
    
    if (revisions.length === 0) {
      return res.json({
        summary: "No revision history has been recorded for this document yet.",
        stats: { totalWordsAdded: 0, totalWordsDeleted: 0, collaborationRating: "N/A", activeDays: 0 }
      });
    }

    const firstRev = revisions[0];
    let totalAdded = 0;
    let totalDeleted = 0;
    const authorStats = {};
    const daysActive = new Set();

    revisions.forEach(rev => {
      totalAdded += rev.wordCountAdded || 0;
      totalDeleted += rev.wordCountDeleted || 0;
      
      const dayStr = new Date(rev.timestamp).toDateString();
      daysActive.add(dayStr);

      if (!authorStats[rev.author]) {
        authorStats[rev.author] = { count: 0, added: 0, deleted: 0 };
      }
      authorStats[rev.author].count += 1;
      authorStats[rev.author].added += rev.wordCountAdded || 0;
      authorStats[rev.author].deleted += rev.wordCountDeleted || 0;
    });

    const collaboratorsList = Object.keys(authorStats);
    
    let summary = `This document ("${doc.title || doc._id}") was initialized on ${new Date(firstRev.timestamp).toLocaleDateString()} by ${firstRev.author}. `;
    summary += `Over a period of ${daysActive.size} active days, a total of ${collaboratorsList.length} collaborator(s) participated in writing, resulting in +${totalAdded} words added and -${totalDeleted} words deleted. `;
    
    summary += "\n\n**Contributor Highlights:**\n";
    collaboratorsList.forEach(author => {
      const stats = authorStats[author];
      const contributionShare = Math.round((stats.added / (totalAdded || 1)) * 100);
      summary += `- **${author}** made ${stats.count} revision(s), introducing ${stats.added} words (${contributionShare}% of total content) and removing ${stats.deleted} words.\n`;
    });

    let rating = "Single Author Dominated";
    if (collaboratorsList.length > 1) {
      const maxContribution = Math.max(...collaboratorsList.map(a => authorStats[a].added));
      const ratio = maxContribution / (totalAdded || 1);
      if (ratio < 0.5) {
        rating = "Highly Balanced Collaboration";
      } else if (ratio < 0.75) {
        rating = "Moderately Balanced Collaboration";
      } else {
        rating = "Unbalanced / Single-Leader Led";
      }
    }

    summary += `\n**Collaboration Status:** Evaluated as **${rating}** based on work distribution. `;

    let handoffsCount = 0;
    let lastAuthor = null;
    let suddenBurstLogs = [];

    revisions.forEach((rev, index) => {
      if (lastAuthor && rev.author !== lastAuthor) {
        handoffsCount++;
      }
      if (rev.wordCountAdded > 150) {
        suddenBurstLogs.push({
          author: rev.author,
          words: rev.wordCountAdded,
          time: new Date(rev.timestamp).toLocaleDateString()
        });
      }
      lastAuthor = rev.author;
    });

    if (handoffsCount > 0) {
      summary += `A total of ${handoffsCount} workflow handoffs between authors occurred during the edit cycle, reflecting active iteration. `;
    }

    if (suddenBurstLogs.length > 0) {
      summary += `\n\n**Process Anomalies Detected:**\n`;
      suddenBurstLogs.forEach(burst => {
        summary += `- **Warning**: ${burst.author} added a sudden burst of ${burst.words} words on ${burst.time}, which may indicate external copying or template pasting.\n`;
      });
    } else {
      summary += " No suspicious last-minute growth spikes or paste events were detected.";
    }

    res.json({
      summary,
      stats: {
        totalWordsAdded: totalAdded,
        totalWordsDeleted: totalDeleted,
        collaborationRating: rating,
        activeDays: daysActive.size
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cross-Group Originality & Content Reuse Analysis API
app.get('/api/documents/cross-group-analysis', async (req, res) => {
  try {
    const docIdsQuery = req.query.docIds;
    if (!docIdsQuery) {
      return res.status(400).json({ error: "Missing docIds query parameter." });
    }

    const docIds = docIdsQuery.split(',');
    const docs = await Document.find({ _id: { $in: docIds } }).lean();

    const stripHtmlText = (html) => {
      if (!html) return "";
      return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    };

    const computeWordOverlap = (t1, t2) => {
      if (!t1 || !t2) return 0;
      const w1 = t1.toLowerCase().match(/\b\w+\b/g) || [];
      const w2 = t2.toLowerCase().match(/\b\w+\b/g) || [];
      if (w1.length === 0 || w2.length === 0) return 0;

      const set1 = new Set(w1);
      const set2 = new Set(w2);
      let intersectionSize = 0;
      set1.forEach(word => {
        if (set2.has(word)) {
          intersectionSize++;
        }
      });
      const minSize = Math.min(set1.size, set2.size);
      return Math.round((intersectionSize / minSize) * 100);
    };

    const findDuplicatePhrases = (t1, t2) => {
      if (!t1 || !t2) return [];
      const w1 = t1.toLowerCase().match(/\b\w+\b/g) || [];
      const w2 = t2.toLowerCase().match(/\b\w+\b/g) || [];
      const phrases = [];
      const phraseLength = 6;

      for (let i = 0; i <= w1.length - phraseLength; i++) {
        const phrase = w1.slice(i, i + phraseLength).join(" ");
        if (w2.join(" ").includes(phrase)) {
          if (!phrases.includes(phrase)) {
            phrases.push(phrase);
          }
        }
      }
      return phrases.slice(0, 3);
    };

    const docsWithText = docs.map(d => ({
      id: d._id,
      title: d.title || d._id,
      source: d.source || 'in_built',
      text: stripHtmlText(d.content),
      collaborators: d.collaborators,
      wordCount: (stripHtmlText(d.content).split(/\s+/).filter(Boolean)).length
    }));

    const similarityMatrix = {};
    const alerts = [];

    docsWithText.forEach(docA => {
      similarityMatrix[docA.id] = {};
      docsWithText.forEach(docB => {
        if (docA.id === docB.id) {
          similarityMatrix[docA.id][docB.id] = 100;
        } else {
          const sim = computeWordOverlap(docA.text, docB.text);
          similarityMatrix[docA.id][docB.id] = sim;

          if (sim > 25 && docA.id < docB.id) {
            const duplicates = findDuplicatePhrases(docA.text, docB.text);
            alerts.push({
              docAId: docA.id,
              docATitle: docA.title,
              docBId: docB.id,
              docBTitle: docB.title,
              similarity: sim,
              duplicatePhrases: duplicates,
              severity: sim > 50 ? 'High' : 'Moderate',
              message: `High similarity (${sim}%) detected between "${docA.title}" and "${docB.title}". Potential content reuse or shared template in sections.`
            });
          }
        }
      });
    });

    res.json({
      documents: docsWithText.map(d => ({ id: d.id, title: d.title, source: d.source, wordCount: d.wordCount, collaborators: d.collaborators })),
      similarityMatrix,
      alerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// Intelligent Document Evolution & ML Revision Analytics APIs
// =========================================================================

// 1. Get raw revisions with before/after diffs and ML classifications
app.get('/api/documents/:id/revisions', async (req, res) => {
  try {
    const documentId = req.params.id;
    const revisions = await Revision.find({ documentId }).sort({ timestamp: -1 }).lean();
    
    // Ensure all revisions have anonymized identifiers
    const sanitized = revisions.map(r => ({
      ...r,
      anonymizedAuthorId: r.anonymizedAuthorId || generateAnonymizedAuthorId(r.author),
      predictedIntent: r.predictedIntent || 'Unclassified',
      predictedSignificance: r.predictedSignificance || 'Unclassified',
      semanticDistance: r.semanticDistance || 0,
      confidence: r.confidence || 0
    }));

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Aggregated ML Revision Analytics (Intent distribution, significance breakdown, semantic change)
app.get('/api/documents/:id/revision-analytics', async (req, res) => {
  try {
    const documentId = req.params.id;
    const revisions = await Revision.find({ documentId }).sort('timestamp').lean();

    const intentCounts = {
      'Language Correction': 0,
      'Paraphrasing': 0,
      'Content Addition': 0,
      'Evidence/Citation Addition': 0,
      'Content Removal': 0,
      'Structural Reorganization': 0,
      'Unclassified': 0
    };

    const significanceCounts = {
      'Minor': 0,
      'Moderate': 0,
      'Major': 0,
      'Unclassified': 0
    };

    const authorIntentMap = {};
    let totalSemanticDistance = 0;
    let distanceCount = 0;
    const timelineData = [];

    revisions.forEach((rev, idx) => {
      const intent = rev.predictedIntent || 'Unclassified';
      const sig = rev.predictedSignificance || 'Unclassified';
      
      if (intentCounts[intent] !== undefined) intentCounts[intent]++;
      else intentCounts['Unclassified']++;

      if (significanceCounts[sig] !== undefined) significanceCounts[sig]++;
      else significanceCounts['Unclassified']++;

      if (typeof rev.semanticDistance === 'number' && rev.semanticDistance > 0) {
        totalSemanticDistance += rev.semanticDistance;
        distanceCount++;
      }

      const authorKey = rev.author || 'Anonymous';
      if (!authorIntentMap[authorKey]) {
        authorIntentMap[authorKey] = {
          author: authorKey,
          anonymizedId: rev.anonymizedAuthorId || generateAnonymizedAuthorId(authorKey),
          totalEdits: 0,
          wordsAdded: 0,
          wordsDeleted: 0,
          intents: { ...intentCounts },
          significances: { ...significanceCounts }
        };
      }
      authorIntentMap[authorKey].totalEdits++;
      authorIntentMap[authorKey].wordsAdded += (rev.wordCountAdded || 0);
      authorIntentMap[authorKey].wordsDeleted += (rev.wordCountDeleted || 0);
      if (authorIntentMap[authorKey].intents[intent] !== undefined) {
        authorIntentMap[authorKey].intents[intent]++;
      }
      if (authorIntentMap[authorKey].significances[sig] !== undefined) {
        authorIntentMap[authorKey].significances[sig]++;
      }

      timelineData.push({
        index: idx + 1,
        revisionId: rev._id,
        timestamp: rev.timestamp,
        author: rev.author,
        anonymizedId: rev.anonymizedAuthorId || generateAnonymizedAuthorId(rev.author),
        section: rev.section || 'General',
        intent,
        significance: sig,
        semanticDistance: rev.semanticDistance || 0,
        wordsAdded: rev.wordCountAdded || 0,
        wordsDeleted: rev.wordCountDeleted || 0
      });
    });

    const avgSemanticDistance = distanceCount > 0 ? Number((totalSemanticDistance / distanceCount).toFixed(3)) : 0;

    res.json({
      documentId,
      totalRevisions: revisions.length,
      intentDistribution: intentCounts,
      significanceDistribution: significanceCounts,
      averageSemanticDistance: avgSemanticDistance,
      authorBreakdown: Object.values(authorIntentMap),
      timeline: timelineData,
      modelMetadata: {
        version: 'v1.0-rules-ml-ensemble',
        framework: 'Intelligent ML Microservice (FastAPI on port 8002)',
        intentTaxonomy: Object.keys(intentCounts).filter(k => k !== 'Unclassified'),
        significanceCriteria: ['Minor', 'Moderate', 'Major']
      },
      disclaimer: "Decision Support Tool: ML revision classifications are provided as analytical process evidence for academic reviewers and do not constitute automated proof of authorship or academic dishonesty."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Retroactive Reclassifier (Upgrades unclassified revisions with ML labels)
app.post('/api/documents/:id/reclassify-all', async (req, res) => {
  try {
    const documentId = req.params.id;
    const revisions = await Revision.find({ documentId });
    let updatedCount = 0;

    for (let rev of revisions) {
      const bText = rev.beforeText || rev.deletedText || "";
      const aText = rev.afterText || rev.addedText || "";
      
      const mlRes = await classifyRevisionWithML(bText, aText, rev.section);
      rev.beforeText = bText;
      rev.afterText = aText;
      rev.anonymizedAuthorId = rev.anonymizedAuthorId || generateAnonymizedAuthorId(rev.author);
      rev.predictedIntent = mlRes.predicted_intent || 'Language Correction';
      rev.predictedSignificance = mlRes.predicted_significance || 'Minor';
      rev.semanticDistance = mlRes.semantic_distance || 0;
      rev.confidence = mlRes.confidence || 0.85;
      rev.modelVersion = mlRes.model_version || 'v1.0-rules-ml-ensemble';
      rev.explanation = mlRes.explanation || '';
      rev.features = mlRes.features || {};
      
      await rev.save();
      updatedCount++;
    }

    res.json({ success: true, documentId, updatedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8001;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another running Node process.`);
    console.error(`👉 Stop the existing process or run: Stop-Process -Name node -Force\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`Node.js + Socket.io Server running on port ${PORT}`);
});
