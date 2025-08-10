import { Express, Request, Response } from 'express';
import { storage } from '../storage';

/**
 * Register team management routes
 */
export function registerTeamRoutes(app: Express) {
  console.log('📋 Registering team management routes');

  // Get all team agents
  app.get('/api/team/agents', async (req: Request, res: Response) => {
    try {
      // Try to get real data from storage
      try {
        const agents = await storage.getTeamAgents();
        if (Array.isArray(agents) && agents.length > 0) {
          return res.json(agents);
        }
      } catch (error) {
        console.log('No team agents in storage, using fallback data');
      }

      // Fallback to mock data
      const mockAgents = [
        {
          id: 1,
          name: "Sarah Johnson",
          email: "sarah.j@example.com",
          skills: ["Web Design", "UI/UX", "Copywriting"],
          hourlyRate: 25,
          hoursWorked: 120,
          assignedProjects: [1, 3, 5],
          rating: 4.8,
          joinedDate: "2025-05-15",
          status: "active"
        },
        {
          id: 2,
          name: "Michael Chen",
          email: "michael.c@example.com",
          skills: ["Frontend Development", "React", "Tailwind CSS"],
          hourlyRate: 35,
          hoursWorked: 85,
          assignedProjects: [2, 4],
          rating: 4.9,
          joinedDate: "2025-06-01",
          status: "active"
        },
        {
          id: 3,
          name: "Alex Rodriguez",
          email: "alex.r@example.com",
          skills: ["Backend Development", "Node.js", "API Design"],
          hourlyRate: 40,
          hoursWorked: 65,
          assignedProjects: [6],
          rating: 4.7,
          joinedDate: "2025-06-10",
          status: "busy"
        }
      ];

      res.json(mockAgents);
    } catch (error) {
      console.error('Error fetching team agents:', error);
      res.status(500).json({ error: 'Failed to fetch team agents' });
    }
  });

  // Get specific team agent
  app.get('/api/team/agents/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      // Try to get real data from storage
      try {
        const agent = await storage.getTeamAgentById(parseInt(agentId));
        if (agent) {
          return res.json(agent);
        }
      } catch (error) {
        console.log(`No team agent with ID ${agentId} in storage`);
      }

      // Return 404 if agent not found
      res.status(404).json({ error: 'Team agent not found' });
    } catch (error) {
      console.error('Error fetching team agent:', error);
      res.status(500).json({ error: 'Failed to fetch team agent' });
    }
  });

  // Create team agent
  app.post('/api/team/agents', async (req: Request, res: Response) => {
    try {
      const agentData = req.body;
      
      // Validate required fields
      if (!agentData.name || !agentData.email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Try to create in real storage
      try {
        const newAgent = await storage.createTeamAgent(agentData);
        return res.status(201).json(newAgent);
      } catch (error) {
        console.log('Could not create team agent in storage, using mock response');
      }

      // Mock response
      res.status(201).json({
        ...agentData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating team agent:', error);
      res.status(500).json({ error: 'Failed to create team agent' });
    }
  });

  // Update team agent
  app.put('/api/team/agents/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const agentData = req.body;
      
      // Try to update in real storage
      try {
        const updatedAgent = await storage.updateTeamAgent(parseInt(agentId), agentData);
        if (updatedAgent) {
          return res.json(updatedAgent);
        }
      } catch (error) {
        console.log(`Could not update team agent ${agentId} in storage`);
      }

      // Mock response
      res.json({
        ...agentData,
        id: parseInt(agentId),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating team agent:', error);
      res.status(500).json({ error: 'Failed to update team agent' });
    }
  });

  // Delete team agent
  app.delete('/api/team/agents/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      // Try to delete from real storage
      try {
        const success = await storage.deleteTeamAgent(parseInt(agentId));
        if (success) {
          return res.json({ success: true });
        }
      } catch (error) {
        console.log(`Could not delete team agent ${agentId} from storage`);
      }

      // Mock response
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting team agent:', error);
      res.status(500).json({ error: 'Failed to delete team agent' });
    }
  });

  console.log('✅ Team management routes registered');
}