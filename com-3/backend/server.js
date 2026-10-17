const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const DiffMatchPatch = require('diff-match-patch');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const dmp = new DiffMatchPatch();

// MongoDB Setup
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://docadmin:docadmin123@cluster0.p6utr.mongodb.net/document-evolution?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB:', MONGODB_URI.startsWith('mongodb+srv') ? 'Cloud MongoDB Atlas' : 'Local MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Password Hashing Helper
function hashPassword(password) {
  const salt = 'doc_evo_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  studentId: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'lecturer'], default: 'student' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: String,
  content: String,
  collaborators: [String],
  owner: { type: String, default: 'system' }, // username or studentId of owner
  ownerName: { type: String, default: 'System Admin' }, // Full name of owner
  allowedUsers: { type: [String], default: [] }, // Array of permitted usernames/studentIds
  isPublic: { type: Boolean, default: false },
  source: { type: String, default: 'in_built' }, // 'in_built', 'google_docs', 'microsoft_365'
  externalId: String,
  syncStatus: { type: String, default: 'synced' }, // 'synced', 'offline'
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Document = mongoose.model('Document', DocumentSchema);

// Permission Checker Helper
function hasDocumentAccess(doc, username, studentId, role) {
  if (!doc) return false;
  if (role === 'lecturer') return true; // Lecturers can view/monitor all student work
  if (doc.isPublic) return true;
  if (doc.owner === 'system' || !doc.owner) return true; // Default template/sample documents

  const cleanUser = username ? username.toLowerCase().trim() : '';
  const cleanStudentId = studentId ? studentId.toLowerCase().trim() : '';

  // Owner access
  if (doc.owner && (doc.owner.toLowerCase() === cleanUser || doc.owner.toLowerCase() === cleanStudentId)) {
    return true;
  }

  // Allowed users array check
  if (doc.allowedUsers && doc.allowedUsers.length > 0) {
    const isAllowed = doc.allowedUsers.some(u => {
      const cleanU = u.toLowerCase().trim();
      return cleanU === cleanUser || cleanU === cleanStudentId;
    });
    if (isAllowed) return true;
  }

  // Collaborators array fallback
  if (doc.collaborators && doc.collaborators.length > 0) {
    const isCollab = doc.collaborators.some(c => {
      const cleanC = c.toLowerCase();
      return cleanC.includes(cleanUser) || cleanC.includes(cleanStudentId);
    });
    if (isCollab) return true;
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
  anomalyFlag: { type: String, default: null } // e.g. 'High-Volume Paste Event Detected' (FR 07)
});
const Revision = mongoose.model('Revision', RevisionSchema);

// Anonymization Helper (Proposal NFR-05 & Section 3.2)
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
    // Graceful fallback if ML service is booting or unreachable
  }

  // Built-in rule-based fallback matching Proposal Table 3.1 & 3.2
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

    if (typeof data === 'string') {
      documentId = data;
    } else if (data && typeof data === 'object') {
      documentId = typeof data.documentId === 'string' ? data.documentId : (typeof data.id === 'string' ? data.id : null);
      username = typeof data.username === 'string' ? data.username : null;
      studentId = typeof data.studentId === 'string' ? data.studentId : null;
      role = typeof data.role === 'string' ? data.role : null;
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

    // Security permission guard
    if (username || studentId || role) {
      const allowed = hasDocumentAccess(doc, username, studentId, role);
      if (!allowed) {
        socket.emit('access-denied', {
          error: 'Access Denied: You do not have permission to join this document session.',
          ownerName: doc.ownerName || doc.owner || "Group Leader"
        });
        return;
      }
    }

    socket.join(documentId);
    socket.emit('load-document', doc.content);
  });

  socket.on('send-changes', async ({ documentId, content, author, studentId }) => {
    if (!documentId) return;

    // Strict Security Guard 1: Verify socket is currently joined in this document's room
    const rooms = Array.from(socket.rooms || []);
    if (!rooms.includes(documentId)) {
      socket.emit('access-denied', { error: 'Security Violation: Unauthorized socket attempting to modify document.' });
      return;
    }

    // Calculate diffs and track evolution
    const doc = await Document.findOne({ _id: documentId });
    if (doc) {
      // Strict Security Guard 2: Verify author access permissions
      if (author && author !== 'Anonymous') {
        const isPermitted = hasDocumentAccess(doc, author, studentId || author, 'student');
        if (!isPermitted) {
          socket.emit('access-denied', { error: 'Security Violation: You do not have permission to modify this document.' });
          return;
        }
      }

      // Broadcast changes to peers only after security verification
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
        // Strict Security Guard 3: Bulk Paste / Insertion Anomaly Detection (FR 07)
        const now = new Date();
        const timeSinceLastEditSec = doc.updatedAt ? Math.max(1, (now.getTime() - new Date(doc.updatedAt).getTime()) / 1000) : 5;
        const isBulk = wordsAdded >= 80 && (wordsAdded / timeSinceLastEditSec) > 15;
        const anomaly = isBulk ? 'High-Volume Paste Event Detected' : null;

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

    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const passwordHash = hashPassword(password);
    const newUser = await User.create({
      username: cleanUsername,
      name: name.trim(),
      studentId: studentId.trim(),
      email: cleanEmail,
      passwordHash,
      role: role === 'lecturer' ? 'lecturer' : 'student'
    });

    const userData = {
      id: newUser._id,
      username: newUser.username,
      name: newUser.name,
      studentId: newUser.studentId,
      email: newUser.email,
      role: newUser.role,
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

    const userData = {
      id: user._id,
      username: user.username,
      name: user.name,
      studentId: user.studentId,
      email: user.email,
      role: user.role,
      displayName: `${user.name} (${user.studentId})`
    };

    res.json({ message: 'Login successful', user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash').sort('name').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Document Management & Access Security APIs

app.post('/api/documents/create', async (req, res) => {
  try {
    const { title, content, owner, ownerName, studentId, source, members } = req.body;
    if (!title || !owner) {
      return res.status(400).json({ error: 'Document title and owner username are required.' });
    }

    const cleanOwner = owner.toLowerCase().trim();
    const cleanStudentId = studentId ? studentId.toLowerCase().trim() : '';

    let formattedOwnerName = ownerName || owner || 'Student';
    if (studentId && cleanStudentId && !formattedOwnerName.toLowerCase().includes(cleanStudentId)) {
      formattedOwnerName = `${formattedOwnerName} (${studentId.trim()})`;
    }

    // Process initial group members
    const initialAllowed = [cleanOwner, cleanStudentId].filter(Boolean);
    const initialCollabs = [formattedOwnerName];

    if (Array.isArray(members) && members.length > 0) {
      members.forEach(m => {
        if (m && typeof m === 'string') {
          const cleanM = m.toLowerCase().trim();
          if (!initialAllowed.includes(cleanM)) initialAllowed.push(cleanM);
          if (!initialCollabs.includes(m)) initialCollabs.push(m);
        }
      });
    }

    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newDoc = await Document.create({
      _id: docId,
      title: title.trim(),
      content: content || `<h2>${title.trim()}</h2><p>Document created by group leader ${formattedOwnerName}. Start writing report here...</p>`,
      owner: cleanOwner,
      ownerName: formattedOwnerName,
      allowedUsers: initialAllowed,
      collaborators: initialCollabs,
      source: source || 'in_built',
      syncStatus: 'synced'
    });

    res.status(201).json({ message: 'Document created successfully', document: newDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const { username, studentId, role } = req.query;
    const allDocs = await Document.find({}).lean();
    
    // Lecturers see all documents for evaluation
    if (role === 'lecturer' || (!username && !studentId)) {
      return res.json(allDocs);
    }

    const filtered = allDocs.filter(doc => hasDocumentAccess(doc, username, studentId, role));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const { username, studentId, role } = req.query;
    const doc = await Document.findOne({ _id: req.params.id }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Access control check
    if (username || studentId || role) {
      const allowed = hasDocumentAccess(doc, username, studentId, role);
      if (!allowed) {
        return res.status(403).json({
          error: "Access Denied: You do not have permission to view or edit this document.",
          isAccessDenied: true,
          ownerName: doc.ownerName || doc.owner || "Group Leader"
        });
      }
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { username, studentId, role } = req.query;
    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Permission check: Owner, allowed user, or lecturer can delete
    if (username || studentId || role) {
      const isAllowed = hasDocumentAccess(doc, username, studentId, role);
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
    const { title, username, studentId, role } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Document title cannot be empty." });
    }

    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Permission check
    if (username || studentId || role) {
      const isAllowed = hasDocumentAccess(doc, username, studentId, role);
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
    const { currentUsername, targetUserIdentifier, action } = req.body;
    if (!targetUserIdentifier) {
      return res.status(400).json({ error: 'Target student identifier (Username, Student ID, or Email) is required.' });
    }

    const doc = await Document.findOne({ _id: req.params.id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Permission check for managing shares
    const cleanRequester = currentUsername ? currentUsername.toLowerCase().trim() : '';
    if (doc.owner && doc.owner !== 'system' && doc.owner.toLowerCase() !== cleanRequester) {
      const isRequesterAllowed = doc.allowedUsers.some(u => u.toLowerCase() === cleanRequester);
      if (!isRequesterAllowed) {
        return res.status(403).json({ error: 'Only the document owner or group members can manage sharing permissions.' });
      }
    }

    const cleanTarget = targetUserIdentifier.toLowerCase().trim();
    
    // Find target user in database
    const targetUser = await User.findOne({
      $or: [
        { username: cleanTarget },
        { studentId: cleanTarget },
        { email: cleanTarget },
        { name: new RegExp('^' + cleanTarget + '$', 'i') }
      ]
    });

    const targetKey = targetUser ? targetUser.username : cleanTarget;
    const targetStudentId = targetUser ? targetUser.studentId : '';
    const targetDisplayName = targetUser ? `${targetUser.name} (${targetUser.studentId})` : cleanTarget;

    if (action === 'remove') {
      doc.allowedUsers = doc.allowedUsers.filter(u => 
        u.toLowerCase() !== targetKey.toLowerCase() && 
        u.toLowerCase() !== cleanTarget &&
        (!targetStudentId || u.toLowerCase() !== targetStudentId.toLowerCase())
      );
      doc.collaborators = doc.collaborators.filter(c => !c.toLowerCase().includes(cleanTarget));
    } else {
      if (!doc.allowedUsers.includes(targetKey)) {
        doc.allowedUsers.push(targetKey);
      }
      if (targetStudentId && !doc.allowedUsers.includes(targetStudentId)) {
        doc.allowedUsers.push(targetStudentId);
      }
      if (!doc.collaborators.includes(targetDisplayName)) {
        doc.collaborators.push(targetDisplayName);
      }
    }

    doc.updatedAt = Date.now();
    await doc.save();

    res.json({
      message: action === 'remove' ? 'Access permission revoked' : 'Permission granted successfully',
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

    // Collect all candidate student authors
    const rawAuthors = [];
    if (doc.ownerName) rawAuthors.push(doc.ownerName.trim());
    if (doc.collaborators) {
      doc.collaborators.forEach(c => {
        if (c && typeof c === 'string' && c.trim()) rawAuthors.push(c.trim());
      });
    }
    revisions.forEach(r => {
      if (r.author && typeof r.author === 'string' && r.author.trim()) {
        rawAuthors.push(r.author.trim());
      }
    });

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
    const authorStats = {};

    authorList.forEach((author, index) => {
      const palette = PALETTES[index % PALETTES.length];
      authorColorMap[author] = palette;
      authorStats[author] = {
        author,
        totalWordsAdded: 0,
        totalWordsDeleted: 0,
        revisionCount: 0,
        ...palette
      };
    });

    revisions.forEach(r => {
      const canonical = canonicalMap[r.author] || r.author;
      if (authorStats[canonical]) {
        authorStats[canonical].totalWordsAdded += (r.wordCountAdded || 0);
        authorStats[canonical].totalWordsDeleted += (r.wordCountDeleted || 0);
        authorStats[canonical].revisionCount += 1;
      }
    });

    // Parse document content into text segments
    const rawContent = doc.content || "<p>No content available.</p>";
    const blocks = rawContent.split(/(<\/p>|<\/h[1-6]>|<\/li>)/gi).filter(Boolean);

    let currentSegmentIndex = 0;
    const segments = [];

    for (let i = 0; i < blocks.length; i += 2) {
      const tagOpenAndBody = blocks[i];
      const tagClose = blocks[i + 1] || '';
      const fullHtmlBlock = tagOpenAndBody + tagClose;

      const plainText = stripHtml(fullHtmlBlock).trim();
      if (!plainText) continue;

      let blockAuthor = authorList[0] || 'Student Author';
      let blockTimestamp = doc.updatedAt || doc.createdAt;
      
      const matchingRev = revisions.find(r => r.addedText && plainText.toLowerCase().includes(r.addedText.toLowerCase().substring(0, 12)));
      if (matchingRev) {
        blockAuthor = canonicalMap[matchingRev.author] || matchingRev.author;
        blockTimestamp = matchingRev.timestamp;
      } else if (revisions.length > 0) {
        const revForBlock = revisions[currentSegmentIndex % revisions.length];
        blockAuthor = canonicalMap[revForBlock.author] || revForBlock.author;
        blockTimestamp = revForBlock.timestamp;
      } else {
        blockAuthor = canonicalMap[blockAuthor] || blockAuthor;
      }

      const palette = authorColorMap[blockAuthor] || PALETTES[0];
      const wordsCount = plainText.split(/\s+/).filter(Boolean).length;

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

    const totalDocWords = Object.values(authorStats).reduce((acc, s) => acc + s.totalWordsAdded, 0) || 1;
    const authorSummary = Object.values(authorStats).map(s => ({
      ...s,
      percentage: Math.min(100, Math.round((s.totalWordsAdded / Math.max(1, totalDocWords)) * 100))
    }));

    res.json({
      documentId: doc._id,
      title: doc.title,
      totalWords: totalDocWords,
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

// Import External Document (Google Docs / MS 365) API
app.post('/api/documents/import-external', async (req, res) => {
  try {
    const { source, docUrl, title } = req.body;
    if (!source || !docUrl) {
      return res.status(400).json({ error: "Source and Document URL are required." });
    }

    // Generate unique ID
    const docId = `${source}_${Math.random().toString(36).substring(2, 9)}`;
    let generatedTitle = title || (source === 'google_docs' ? 'Climate Change Research' : 'Smart Cities Project Proposal');
    
    let content = '';
    let collaborators = [];
    let revisionsData = [];
    const now = new Date();

    if (source === 'google_docs') {
      content = `<h1>Climate Change Impact Report</h1>
<p>Climate change refers to long-term shifts in temperatures and weather patterns. These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change.</p>
<h2>1. Introduction</h2>
<p>Greenhouse gas emissions blanket the Earth, trapping the sun's heat and leading to global warming. Carbon dioxide and methane are prominent examples.</p>
<h2>2. Methodology</h2>
<p>Our group analyzed temperature changes over the past fifty years using dataset aggregates from global climate monitoring stations.</p>
<h2>3. Conclusion</h2>
<p>Transitioning energy systems from fossil fuels to renewables like solar or wind will decrease the emissions driving climate change.</p>`;
      collaborators = ["Alice Cooper", "Bob Dylan", "Charlie Watts"];
      
      revisionsData = [
        {
          author: "Alice Cooper",
          timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          addedText: "Climate Change Impact Report\nClimate change refers to long-term shifts in temperatures and weather patterns.",
          deletedText: "",
          wordCountAdded: 25,
          wordCountDeleted: 0,
          section: "Title"
        },
        {
          author: "Alice Cooper",
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          addedText: "1. Introduction\nGreenhouse gas emissions blanket the Earth, trapping the sun's heat and leading to global warming. Carbon dioxide and methane are prominent examples.",
          deletedText: "",
          wordCountAdded: 30,
          wordCountDeleted: 0,
          section: "Introduction"
        },
        {
          author: "Bob Dylan",
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          addedText: "2. Methodology\nOur group analyzed temperature changes over the past fifty years using dataset aggregates from global climate monitoring stations.",
          deletedText: "",
          wordCountAdded: 25,
          wordCountDeleted: 0,
          section: "Methodology"
        },
        {
          author: "Charlie Watts",
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          addedText: "3. Conclusion\nTransitioning energy systems from fossil fuels to renewables like solar or wind will decrease the emissions driving climate change.",
          deletedText: "",
          wordCountAdded: 20,
          wordCountDeleted: 0,
          section: "Conclusion"
        },
        {
          author: "Alice Cooper",
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          addedText: "These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change.",
          deletedText: "",
          wordCountAdded: 20,
          wordCountDeleted: 0,
          section: "Title"
        },
        {
          author: "Charlie Watts",
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          addedText: "ADDITIONAL COPIED MATERIAL: Climate change refers to long-term shifts in temperatures and weather patterns. These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change. Greenhouse gas emissions blanket the Earth, trapping the sun's heat and leading to global warming.",
          deletedText: "",
          wordCountAdded: 550, // Burst of text (suspicious growth!)
          wordCountDeleted: 0,
          section: "Methodology"
        }
      ];
    } else {
      content = `<h1>Smart Cities Infrastructure</h1>
<p>A smart city is a technologically modern urban area that uses different types of electronic methods and sensors to collect specific data.</p>
<h2>1. Overview</h2>
<p>Data assets gathered from citizens, devices, buildings and assets are processed and analyzed to monitor and manage traffic and transportation systems.</p>
<h2>2. Sensor Networks</h2>
<p>IoT nodes will be scattered across district grids to monitor real-time air quality metrics, water flow, and parking occupancy rates.</p>
<h2>3. Recommendations</h2>
<p>We propose a centralized telemetry broker that scales horizontally with cloud infrastructure resources.</p>`;
      collaborators = ["David Miller", "Emma Watson", "Frank Sinatra"];

      revisionsData = [
        {
          author: "David Miller",
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          addedText: "Smart Cities Infrastructure\nA smart city is a technologically modern urban area that uses different types of electronic methods.",
          deletedText: "",
          wordCountAdded: 25,
          wordCountDeleted: 0,
          section: "Title"
        },
        {
          author: "Emma Watson",
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          addedText: "1. Overview\nData assets gathered from citizens, devices, buildings and assets are processed and analyzed to monitor and manage traffic and transportation systems.",
          deletedText: "",
          wordCountAdded: 25,
          wordCountDeleted: 0,
          section: "Overview"
        },
        {
          author: "Frank Sinatra",
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          addedText: "3. Recommendations\nWe propose a centralized telemetry broker that scales horizontally with cloud infrastructure resources.",
          deletedText: "",
          wordCountAdded: 15,
          wordCountDeleted: 0,
          section: "Recommendations"
        },
        {
          author: "Emma Watson",
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          addedText: "2. Sensor Networks\nIoT nodes will be scattered across district grids to monitor real-time air quality metrics, water flow, and parking occupancy rates.",
          deletedText: "",
          wordCountAdded: 25,
          wordCountDeleted: 0,
          section: "Sensor Networks"
        },
        {
          author: "David Miller",
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          addedText: "and sensors to collect specific data.",
          deletedText: "",
          wordCountAdded: 6,
          wordCountDeleted: 0,
          section: "Title"
        }
      ];
    }

    // Save document to Mongo
    await Document.create({
      _id: docId,
      title: generatedTitle,
      content,
      collaborators,
      source,
      externalId: docUrl,
      syncStatus: 'synced',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now
    });

    // Save revisions
    for (let rev of revisionsData) {
      const mlRes = await classifyRevisionWithML(rev.deletedText || "", rev.addedText || "", rev.section);
      await Revision.create({
        documentId: docId,
        author: rev.author,
        anonymizedAuthorId: generateAnonymizedAuthorId(rev.author),
        timestamp: rev.timestamp,
        beforeText: rev.deletedText || "",
        afterText: rev.addedText || "",
        addedText: rev.addedText,
        deletedText: rev.deletedText,
        wordCountAdded: rev.wordCountAdded,
        wordCountDeleted: rev.wordCountDeleted,
        section: rev.section,
        sourcePlatform: source,
        syncStatus: 'synced',
        predictedIntent: mlRes.predicted_intent || 'Unclassified',
        predictedSignificance: mlRes.predicted_significance || 'Unclassified',
        semanticDistance: mlRes.semantic_distance || 0,
        confidence: mlRes.confidence || 0,
        modelVersion: mlRes.model_version || 'v1.0-rules-ml-ensemble',
        explanation: mlRes.explanation || ''
      });
    }

    res.status(201).json({ success: true, docId, title: generatedTitle });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
// Component 3: Intelligent Document Evolution & ML Revision Analytics APIs
// =========================================================================

// 1. Get raw revisions with before/after diffs and ML classifications (FR 09, FR 10)
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
        framework: 'Component 3 ML Microservice (FastAPI on port 8002)',
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
