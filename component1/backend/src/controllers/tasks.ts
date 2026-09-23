import { Request, Response } from 'express';
import { Task, Team } from '../models';
import * as mockDb from '../models/mockStore';

export const createTask = async (req: any, res: Response): Promise<void> => {
  try {
    const { title, description, assignedTo, teamId, assignmentId } = req.body;

    if (!title || !assignedTo || !teamId || !assignmentId) {
      res.status(400).json({ error: 'Title, assignee, team ID, and assignment ID are required' });
      return;
    }

    const taskData = {
      title,
      description: description || '',
      status: 'todo' as const,
      assignedTo,
      team: teamId,
      assignment: assignmentId,
      createdAt: new Date()
    };

    if (!mockDb.isDbConnected()) {
      const newTask = {
        _id: mockDb.generateId(),
        ...taskData
      };
      mockDb.mockTasks.push(newTask);
      res.status(201).json({ message: 'Task created (Mock DB)', task: newTask });
      return;
    }

    const newTask = new Task(taskData);
    await newTask.save();
    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (error: any) {
    console.error('Create Task Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTasksByTeam = async (req: any, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    if (!mockDb.isDbConnected()) {
      const tasks = mockDb.mockTasks.filter(t => t.team === teamId);
      // Map/populate user names
      const populatedTasks = tasks.map(t => {
        const u = mockDb.mockUsers.find(user => user._id === t.assignedTo);
        return {
          ...t,
          assignedTo: { _id: u?._id, name: u?.name }
        };
      });
      res.status(200).json({ tasks: populatedTasks });
      return;
    }

    const tasks = await Task.find({ team: teamId }).populate('assignedTo', 'name');
    res.status(200).json({ tasks });
  } catch (error: any) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateTaskStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status || !['todo', 'inprogress', 'done'].includes(status)) {
      res.status(400).json({ error: 'Invalid or missing status' });
      return;
    }

    const completedAt = status === 'done' ? new Date() : undefined;

    if (!mockDb.isDbConnected()) {
      const task = mockDb.mockTasks.find(t => t._id === taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      task.status = status;
      task.completedAt = completedAt;
      res.status(200).json({ message: 'Task updated (Mock DB)', task });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    task.status = status;
    task.completedAt = completedAt;
    await task.save();

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error: any) {
    console.error('Update Task Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteTask = async (req: any, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!mockDb.isDbConnected()) {
      const idx = mockDb.mockTasks.findIndex(t => t._id === taskId);
      if (idx === -1) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      mockDb.mockTasks.splice(idx, 1);
      res.status(200).json({ message: 'Task deleted successfully (Mock DB)' });
      return;
    }

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Delete Task Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
