import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useStacksContract } from '../../hooks/useStacksContract';

interface Task {
  taskId: number;
  creator: string;
  description: string;
  reward: number;
  deadline: number;
  claimedBy?: string;
  completed: boolean;
  verifiedCount: number;
  verifiers: string[];
}

interface TaskCardProps {
  task: Task;
  userAddress?: string;
  onTaskUpdate?: (taskId: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  userAddress,
  onTaskUpdate 
}) => {
  const [loading, setLoading] = React.useState(false);
  const { claimTask, completeTask, verifyTask } = useStacksContract();

  const isCreator = userAddress === task.creator;
  const isClaimer = userAddress === task.claimedBy;
  const hasVerified = task.verifiers.includes(userAddress || '');
  const isClaimable = !task.claimedBy && !isCreator;
  const isVerifiable = task.completed && !isCreator && !isClaimer && !hasVerified;

  const handleClaim = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      await claimTask(task.taskId);
      onTaskUpdate?.(task.taskId);
    } catch (error) {
      console.error('Error claiming task:', error);
      alert('Failed to claim task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeTask(task.taskId);
      onTaskUpdate?.(task.taskId);
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      await verifyTask(task.taskId);
      onTaskUpdate?.(task.taskId);
    } catch (error) {
      console.error('Error verifying task:', error);
      alert('Failed to verify task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isDeadlinePassed = task.deadline < /* current block height */ 0; // You'll need to get current block height

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold">{task.description}</h3>
            <div className="text-sm text-gray-500">
              Created by: {task.creator}
              {task.claimedBy && (
                <span className="ml-2">| Claimed by: {task.claimedBy}</span>
              )}
            </div>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">{task.reward} STX</span>
              <span>Block: {task.deadline}</span>
              <span>Verifications: {task.verifiedCount}</span>
              {task.completed && (
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completed
                </span>
              )}
              {isDeadlinePassed && !task.completed && (
                <span className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Expired
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {isClaimable && !isDeadlinePassed && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClaim}
                disabled={loading}
              >
                Claim
              </Button>
            )}
            {isClaimer && !task.completed && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleComplete}
                disabled={loading}
              >
                Complete
              </Button>
            )}
            {isVerifiable && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleVerify}
                disabled={loading}
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