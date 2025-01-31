import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { useStacksContract } from '../../hooks/useStacksContract';

interface CreateTaskProps {
  onTaskCreated: (task: any) => void;
  userAddress?: string;
}

export const CreateTask: React.FC<CreateTaskProps> = ({ onTaskCreated, userAddress }) => {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    description: '',
    reward: '',
    deadline: ''
  });

  const { createTask } = useStacksContract();

  const handleSubmit = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.description || !formData.reward || !formData.deadline) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await createTask(
        formData.description,
        Number(formData.reward),
        Number(formData.deadline),
        userAddress
      );

      // Create a task object to update the UI
      const newTask = {
        taskId: Date.now(), // This will be replaced by actual task ID from blockchain
        description: formData.description,
        reward: Number(formData.reward),
        deadline: Number(formData.deadline),
        creator: userAddress,
        completed: false,
        verifiedCount: 0,
        verifiers: []
      };

      onTaskCreated(newTask);
      
      // Reset form
      setFormData({
        description: '',
        reward: '',
        deadline: ''
      });
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Task description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              placeholder="Reward (STX)"
              value={formData.reward}
              onChange={(e) => setFormData({...formData, reward: e.target.value})}
            />
            <Input
              type="number"
              placeholder="Deadline (block height)"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
            />
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !userAddress}
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
          {!userAddress && (
            <p className="text-sm text-red-500 text-center">
              Connect your wallet to create tasks
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};