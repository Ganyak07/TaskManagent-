// src/types/tasks.ts
export interface Task {
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
  
  export interface CreateTaskInput {
    description: string;
    reward: number;
    deadline: number;
  }
  
  // src/hooks/useStacksContract.ts
  import { useCallback } from 'react';
  import { 
    stringUtf8CV,
    uintCV
  } from '@stacks/transactions';
  
  export const useStacksContract = () => {
    const createTask = useCallback(async (description: string, reward: number, deadline: number) => {
      try {
        // This is where you'll add the actual contract interaction
        console.log('Contract call args:', {
          description: stringUtf8CV(description),
          reward: uintCV(reward),
          deadline: uintCV(deadline)
        });
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    }, []);
  
    return { createTask };
  };