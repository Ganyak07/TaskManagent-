// src/components/tasks/TaskList.tsx
import React from 'react';
import { CreateTask } from './CreateTask';
import { TaskCard } from './TaskCard';
import { Task } from '../../types/tasks';

export const TaskList = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);

  return (
    <div className="space-y-6">
      <CreateTask onTaskCreated={(task) => setTasks([...tasks, task])} />
      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard key={task.taskId} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-gray-500">No tasks available</p>
        )}
      </div>
    </div>
  );
};

export default TaskList;

// src/components/tasks/CreateTask.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Plus } from 'lucide-react';
import { CreateTaskInput } from '../../types/tasks';

interface CreateTaskProps {
  onTaskCreated: (task: any) => void;
}

export const CreateTask: React.FC<CreateTaskProps> = ({ onTaskCreated }) => {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateTaskInput>({
    description: '',
    reward: 0,
    deadline: 0,
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Here you'll add the contract interaction
      console.log('Creating task:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      onTaskCreated({
        ...formData,
        taskId: Date.now(),
        creator: 'Current User',
        completed: false,
        verifiedCount: 0,
        verifiers: []
      });
      setFormData({ description: '', reward: 0, deadline: 0 });
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Task description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              placeholder="Reward (STX)"
              value={formData.reward || ''}
              onChange={(e) => setFormData({ ...formData, reward: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Deadline (block height)"
              value={formData.deadline || ''}
              onChange={(e) => setFormData({ ...formData, deadline: Number(e.target.value) })}
            />
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// src/components/tasks/TaskCard.tsx
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Task } from '../../types/tasks';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold">{task.description}</h3>
            <div className="text-sm text-gray-500">
              Created by: {task.creator}
            </div>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">{task.reward} STX</span>
              <span>Block: {task.deadline}</span>
              <span>Verifications: {task.verifiedCount}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => console.log('Claim task:', task.taskId)}
            >
              Claim
            </Button>
            {task.completed && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log('Verify task:', task.taskId)}
              >
                Verify
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};