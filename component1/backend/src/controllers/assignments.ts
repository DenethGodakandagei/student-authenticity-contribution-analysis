import { Request, Response } from 'express';
import { Assignment, Team } from '../models';
import * as mockDb from '../models/mockStore';

export const createAssignment = async (req: any, res: Response): Promise<void> => {
  try {
    const { title, description, deadline, assignmentType, weights } = req.body;
    const createdBy = req.user.id;

    if (!title || !description || !deadline) {
      res.status(400).json({ error: 'Title, description, and deadline are required' });
      return;
    }

    // Generate random invite code
    const invitationCode = `INV-${Math.floor(100 + Math.random() * 900)}`;

    const assignmentData = {
      title,
      description,
      deadline: new Date(deadline),
      assignmentType: assignmentType || 'team',
      weights: {
        git: weights?.git ?? 40,
        vscode: weights?.vscode ?? 30,
        task: weights?.task ?? 20,
        collab: weights?.collab ?? 10
      },
      invitationCode,
      createdBy,
      createdAt: new Date()
    };

    if (!mockDb.isDbConnected()) {
      const newAssignment = {
        _id: mockDb.generateId(),
        ...assignmentData
      };
      mockDb.mockAssignments.push(newAssignment);
      mockDb.saveToDisk();
      res.status(201).json({ message: 'Assignment created (Mock DB)', assignment: newAssignment });
      return;
    }

    const newAssignment = new Assignment(assignmentData);
    await newAssignment.save();

    res.status(201).json({ message: 'Assignment created successfully', assignment: newAssignment });
  } catch (error: any) {
    console.error('Create Assignment Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAssignments = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!mockDb.isDbConnected()) {
      if (userRole === 'lecturer') {
        const assignments = mockDb.mockAssignments.filter(a => a.createdBy === userId);
        res.status(200).json({ assignments });
      } else {
        // For students, find assignments where they are members of a team in that assignment
        const studentTeams = mockDb.mockTeams.filter(t => 
          t.members.some((m: any) => m.student === userId)
        );
        const assignmentIds = studentTeams.map(t => t.assignment);
        const assignments = mockDb.mockAssignments.filter(a => assignmentIds.includes(a._id));
        res.status(200).json({ assignments });
      }
      return;
    }

    if (userRole === 'lecturer') {
      const assignments = await Assignment.find({ createdBy: userId });
      res.status(200).json({ assignments });
    } else {
      // Find assignments where student is in a team
      const studentTeams = await Team.find({ 'members.student': userId });
      const assignmentIds = studentTeams.map((t: any) => t.assignment);
      const assignments = await Assignment.find({ _id: { $in: assignmentIds } });
      res.status(200).json({ assignments });
    }
  } catch (error: any) {
    console.error('Get Assignments Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAssignmentById = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mockDb.isDbConnected()) {
      const assignment = mockDb.mockAssignments.find(a => a._id === id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }
      res.status(200).json({ assignment });
      return;
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }
    res.status(200).json({ assignment });
  } catch (error: any) {
    console.error('Get Assignment By ID Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAssignmentByInviteCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    if (!mockDb.isDbConnected()) {
      const assignment = mockDb.mockAssignments.find(a => a.invitationCode === code.trim());
      if (!assignment) {
        res.status(404).json({ error: 'Invalid invitation code' });
        return;
      }
      const teams = mockDb.mockTeams.filter(t => t.assignment === assignment._id);
      res.status(200).json({ assignment, teams });
      return;
    }

    const assignment = await Assignment.findOne({ invitationCode: code.trim() });
    if (!assignment) {
      res.status(404).json({ error: 'Invalid invitation code' });
      return;
    }
    const teams = await Team.find({ assignment: assignment._id }).select('name inviteCode');
    res.status(200).json({ assignment, teams });
  } catch (error: any) {
    console.error('Get Assignment By Invite Code Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
