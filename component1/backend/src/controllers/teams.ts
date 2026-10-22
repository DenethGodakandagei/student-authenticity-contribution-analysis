import { Request, Response } from 'express';
import { Team, Assignment, User } from '../models';
import * as mockDb from '../models/mockStore';

export const createTeam = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, assignmentId, gitUsername, memberIds, repositoryUrl, repoUrl } = req.body;
    const studentId = req.user.id;

    let assignmentObj: any = null;
    if (!mockDb.isDbConnected()) {
      assignmentObj = mockDb.mockAssignments.find(a => a._id === assignmentId);
    } else {
      assignmentObj = await Assignment.findById(assignmentId);
    }

    const isIndividual = assignmentObj?.assignmentType === 'individual';
    const finalName = name || (isIndividual ? `${req.user.name || 'Student'} (Individual)` : '');

    const effectiveRepoUrl = (repositoryUrl || repoUrl || '').trim();

    if (!finalName || !assignmentId || !gitUsername) {
      res.status(400).json({ error: isIndividual ? 'GitHub username is required' : 'Team name, assignment ID, and git username are required' });
      return;
    }

    if (!effectiveRepoUrl) {
      res.status(400).json({ 
        error: isIndividual 
          ? 'GitHub repository URL is required for individual assignments' 
          : 'GitHub repository URL is required when creating a team' 
      });
      return;
    }

    const inviteCode = isIndividual ? `IND-${Math.floor(1000 + Math.random() * 9000)}` : `TEAM-${Math.floor(1000 + Math.random() * 9000)}`;

    const membersList: any[] = [{ student: studentId, gitUsername }];
    if (!isIndividual && Array.isArray(memberIds)) {
      memberIds.forEach((id: string) => {
        if (id && id !== studentId) {
          membersList.push({ student: id, gitUsername: `git-${id.slice(-4)}` });
        }
      });
    }

    const teamData = {
      name: finalName,
      assignment: assignmentId,
      leader: studentId,
      inviteCode,
      repositoryUrl: (repositoryUrl || repoUrl || '').trim(),
      members: membersList,
      createdAt: new Date()
    };

    if (!mockDb.isDbConnected()) {
      // Check if student already has a team for this assignment
      const alreadyHasTeam = mockDb.mockTeams.some(t => 
        t.assignment === assignmentId && t.members.some((m: any) => m.student === studentId)
      );
      if (alreadyHasTeam) {
        res.status(400).json({ error: isIndividual ? 'You have already started this individual assignment' : 'You are already registered in a team for this assignment' });
        return;
      }

      const newTeam = {
        _id: mockDb.generateId(),
        ...teamData
      };
      mockDb.mockTeams.push(newTeam);
      res.status(201).json({ message: 'Team created (Mock DB)', team: newTeam });
      return;
    }

    // Check if student already in team
    const alreadyHasTeam = await Team.findOne({
      assignment: assignmentId,
      'members.student': studentId
    });
    if (alreadyHasTeam) {
      res.status(400).json({ error: 'You are already registered in a team for this assignment' });
      return;
    }

    const newTeam = new Team(teamData);
    await newTeam.save();

    res.status(201).json({ message: 'Team created successfully', team: newTeam });
  } catch (error: any) {
    console.error('Create Team Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const joinTeam = async (req: any, res: Response): Promise<void> => {
  try {
    const { inviteCode, gitUsername } = req.body;
    const studentId = req.user.id;

    if (!inviteCode) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    let username = gitUsername;
    if (!username) {
      if (!mockDb.isDbConnected()) {
        const user = mockDb.mockUsers.find(u => u._id === studentId);
        username = user ? user.name.toLowerCase().replace(/\s+/g, '-') : `git-${studentId.slice(-4)}`;
      } else {
        const user = await User.findById(studentId);
        username = user ? user.name.toLowerCase().replace(/\s+/g, '-') : `git-${studentId.toString().slice(-4)}`;
      }
    }

    if (!mockDb.isDbConnected()) {
      const team = mockDb.mockTeams.find(t => t.inviteCode === inviteCode.trim());
      if (!team) {
        res.status(404).json({ error: 'Invalid team invite code' });
        return;
      }

      const assignment = mockDb.mockAssignments.find(a => a._id === team.assignment);
      if (assignment?.assignmentType === 'individual') {
        res.status(400).json({ error: 'This is an individual assignment. Multiple members cannot join the same workspace.' });
        return;
      }

      // Check if already in this team
      if (team.members.some((m: any) => m.student === studentId)) {
        res.status(400).json({ error: 'You are already a member of this team' });
        return;
      }

      // Check if already in another team for this assignment
      const inAnotherTeam = mockDb.mockTeams.some(t => 
        t.assignment === team.assignment && t.members.some((m: any) => m.student === studentId)
      );
      if (inAnotherTeam) {
        res.status(400).json({ error: 'You are already in a team for this assignment' });
        return;
      }

      team.members.push({ student: studentId, gitUsername: username });
      res.status(200).json({ message: 'Joined team successfully (Mock DB)', team });
      return;
    }

    const team = await Team.findOne({ inviteCode: inviteCode.trim() });
    if (!team) {
      res.status(404).json({ error: 'Invalid team invite code' });
      return;
    }

    const assignment = await Assignment.findById(team.assignment);
    if (assignment?.assignmentType === 'individual') {
      res.status(400).json({ error: 'This is an individual assignment. Multiple members cannot join the same workspace.' });
      return;
    }

    // Check if student already in team
    if (team.members.some((m: any) => m.student.toString() === studentId)) {
      res.status(400).json({ error: 'You are already a member of this team' });
      return;
    }

    const inAnotherTeam = await Team.findOne({
      assignment: team.assignment,
      'members.student': studentId
    });
    if (inAnotherTeam) {
      res.status(400).json({ error: 'You are already in a team for this assignment' });
      return;
    }

    team.members.push({ student: studentId as any, gitUsername: username });
    await team.save();

    res.status(200).json({ message: 'Joined team successfully', team });
  } catch (error: any) {
    console.error('Join Team Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateRepositoryUrl = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId, repositoryUrl } = req.body;
    const studentId = req.user.id;

    if (!teamId || !repositoryUrl) {
      res.status(400).json({ error: 'Team ID and Repository URL are required' });
      return;
    }

    if (!mockDb.isDbConnected()) {
      const team = mockDb.mockTeams.find(t => t._id === teamId);
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      // Check if student is in this team or is leader
      const isMember = (team.leader && team.leader.toString() === studentId) ||
        (team.members && team.members.some((m: any) => (m.student?._id || m.student)?.toString() === studentId));

      if (!isMember && req.user.role !== 'lecturer') {
        res.status(403).json({ error: 'Access denied: You are not a member of this team' });
        return;
      }

      team.repositoryUrl = repositoryUrl.trim();
      res.status(200).json({ message: 'Repository URL updated (Mock DB)', team });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const isMember = (team.leader && team.leader.toString() === studentId) ||
      (team.members && team.members.some((m: any) => (m.student?._id || m.student)?.toString() === studentId));

    if (!isMember && req.user.role !== 'lecturer') {
      res.status(403).json({ error: 'Access denied: You are not a member of this team' });
      return;
    }

    if (!team.leader) {
      team.leader = studentId as any;
    }

    team.repositoryUrl = repositoryUrl.trim();
    await team.save();

    res.status(200).json({ message: 'Repository URL updated successfully', team });
  } catch (error: any) {
    console.error('Update Repo Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTeamByAssignment = async (req: any, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    if (!mockDb.isDbConnected()) {
      // Find team containing the student
      let team = mockDb.mockTeams.find(t => 
        t.assignment === assignmentId && t.members.some((m: any) => m.student === userId)
      );

      if (!team) {
        res.status(404).json({ error: 'Team not found for this assignment' });
        return;
      }

      // Populate member details
      const populatedMembers = team.members.map((m: any) => {
        const u = mockDb.mockUsers.find(user => user._id === m.student);
        return {
          student: { _id: u?._id, name: u?.name, email: u?.email },
          gitUsername: m.gitUsername
        };
      });

      res.status(200).json({ team: { ...team, members: populatedMembers } });
      return;
    }

    const team = await Team.findOne({
      assignment: assignmentId,
      'members.student': userId
    }).populate('members.student', 'name email');

    if (!team) {
      res.status(404).json({ error: 'Team not found for this assignment' });
      return;
    }

    res.status(200).json({ team });
  } catch (error: any) {
    console.error('Get Team By Assignment Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createGeneralTeam = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, gitUsername, memberIds, repositoryUrl } = req.body;
    const studentId = req.user.id;

    const effectiveRepoUrl = (repositoryUrl || '').trim();

    if (!name || !gitUsername || !effectiveRepoUrl) {
      res.status(400).json({ error: 'Team name, GitHub username, and repository URL are required' });
      return;
    }

    const inviteCode = `TEAM-${Math.floor(1000 + Math.random() * 9000)}`;

    const membersList: any[] = [{ student: studentId, gitUsername }];
    if (Array.isArray(memberIds)) {
      memberIds.forEach((id: string) => {
        if (id && id !== studentId) {
          membersList.push({ student: id, gitUsername: `git-${id.slice(-4)}` });
        }
      });
    }

    const teamData = {
      name,
      leader: studentId,
      inviteCode,
      repositoryUrl: repositoryUrl ? repositoryUrl.trim() : '',
      members: membersList,
      createdAt: new Date()
    };

    if (!mockDb.isDbConnected()) {
      const newTeam = {
        _id: mockDb.generateId(),
        ...teamData
      };
      mockDb.mockTeams.push(newTeam);
      res.status(201).json({ message: 'General team created (Mock DB)', team: newTeam });
      return;
    }

    const newTeam = new Team(teamData);
    await newTeam.save();

    res.status(201).json({ message: 'General team created successfully', team: newTeam });
  } catch (error: any) {
    console.error('Create General Team Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addAssignmentToTeam = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const { inviteCode } = req.body;
    const studentId = req.user.id;

    if (!inviteCode) {
      res.status(400).json({ error: 'Assignment invitation code is required' });
      return;
    }

    if (!mockDb.isDbConnected()) {
      // Find assignment
      const assignment = mockDb.mockAssignments.find(a => a.invitationCode === inviteCode.trim());
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found for the given invitation code' });
        return;
      }

      // Find team
      const teamIndex = mockDb.mockTeams.findIndex(t => t._id === teamId);
      if (teamIndex === -1) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      const team = mockDb.mockTeams[teamIndex];

      // Verify leader
      if (team.leader !== studentId) {
        res.status(403).json({ error: 'Access denied: Only the Team Leader can add assignments' });
        return;
      }

      // Check if student already has a team for this assignment
      const alreadyHasTeam = mockDb.mockTeams.some(t => 
        t.assignment === assignment._id && t.members.some((m: any) => m.student === studentId)
      );
      if (alreadyHasTeam) {
        res.status(400).json({ error: 'A member of this team is already registered in a team for this assignment' });
        return;
      }

      // If the team does not have any assignment linked, link it
      if (!team.assignment) {
        team.assignment = assignment._id;
        res.status(200).json({ message: 'Assignment added to team successfully (Mock DB)', team });
      } else {
        // If the team is already linked to an assignment, clone it for the new assignment
        const clonedTeam = {
          ...team,
          _id: mockDb.generateId(),
          assignment: assignment._id,
          createdAt: new Date()
        };
        mockDb.mockTeams.push(clonedTeam);
        res.status(200).json({ message: 'Assignment added to team (Cloned team created, Mock DB)', team: clonedTeam });
      }
      return;
    }

    // MongoDB Mode
    const assignment = await Assignment.findOne({ invitationCode: inviteCode.trim() });
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found for the given invitation code' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Verify leader or member
    const isLeaderOrMember = (team.leader && team.leader.toString() === studentId) ||
      (team.members && team.members.some((m: any) => (m.student?._id || m.student)?.toString() === studentId));
    if (!isLeaderOrMember) {
      res.status(403).json({ error: 'Access denied: Only team members can add assignments' });
      return;
    }

    // Check if student already in team for this assignment
    const alreadyHasTeam = await Team.findOne({
      assignment: assignment._id,
      'members.student': studentId
    });
    if (alreadyHasTeam) {
      res.status(400).json({ error: 'A member of this team is already registered in a team for this assignment' });
      return;
    }

    if (!team.assignment) {
      team.assignment = assignment._id as any;
      await team.save();
      res.status(200).json({ message: 'Assignment added to team successfully', team });
    } else {
      // Clone team document for compatibility
      const clonedTeam = new Team({
        name: team.name,
        assignment: assignment._id,
        leader: team.leader,
        inviteCode: `TEAM-${Math.floor(1000 + Math.random() * 9000)}`,
        members: team.members,
        repositoryUrl: team.repositoryUrl
      });
      await clonedTeam.save();
      res.status(200).json({ message: 'Assignment added to team (Cloned team created)', team: clonedTeam });
    }
  } catch (error: any) {
    console.error('Add Assignment to Team Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getMyTeams = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    if (!mockDb.isDbConnected()) {
      const teams = mockDb.mockTeams.filter(t => 
        t.leader === userId || t.members.some((m: any) => m.student === userId)
      );
      
      // Populate member details in mock
      const populatedTeams = teams.map(t => {
        const members = t.members.map((m: any) => {
          const u = mockDb.mockUsers.find(user => user._id === m.student);
          return {
            student: { _id: u?._id, name: u?.name, email: u?.email },
            gitUsername: m.gitUsername
          };
        });
        return { ...t, members };
      });

      res.status(200).json({ teams: populatedTeams });
      return;
    }

    // Find teams where user is leader or member
    const teams = await Team.find({
      $or: [
        { leader: userId },
        { 'members.student': userId }
      ]
    })
    .populate('members.student', 'name email')
    .populate('assignment', 'title description invitationCode');

    res.status(200).json({ teams });
  } catch (error: any) {
    console.error('Get My Teams Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
