import { describe, expect, it, beforeEach } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("StackTasks Contract Tests", () => {
  const taskDescription = "Test task description";
  const reward = 100_000_000; // 100 STX
  const deadline = 100;

  beforeEach(() => {
    // Reset blockchain state before each test
    simnet.setBurnBlockHeight(1);
  });

  describe("Task Creation", () => {
    it("successfully creates a task", () => {
      const block = simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
      
      expect(block.result).toBeOk(0); // First task should have ID 0
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [0],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task.creator).toBePrincipal(wallet1);
      expect(task.description).toBeUtf8(taskDescription);
      expect(task.reward).toBeUint(reward);
      expect(task.deadline).toBeUint(deadline);
      expect(task["claimed-by"]).toBeNone();
      expect(task.completed).toBeFalse();
      expect(task["verified-count"]).toBeUint(0);
    });

    it("fails to create task with insufficient balance", () => {
      const highReward = 1_000_000_000_000; // Very high reward
      const block = simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, highReward, deadline],
        wallet1
      );
      
      expect(block.result).toBeErr(106); // err-insufficient-balance
    });

    it("fails to create task with past deadline", () => {
      simnet.setBurnBlockHeight(200);
      const block = simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
      
      expect(block.result).toBeErr(107); // err-past-deadline
    });
  });

  describe("Task Completion and Verification", () => {
    beforeEach(() => {
      // Create a task before each test in this group
      simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
    });

    it("successfully completes a claimed task", () => {
      // First claim the task
      simnet.callPublicFn(
        "stack-tasks",
        "claim-task",
        [0],
        wallet2
      );

      const completeBlock = simnet.callPublicFn(
        "stack-tasks",
        "complete-task",
        [0],
        wallet2
      );
      
      expect(completeBlock.result).toBeOk(true);
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [0],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task.completed).toBeTrue();
    });

    it("successfully verifies a completed task", () => {
      // Claim and complete the task first
      simnet.callPublicFn("stack-tasks", "claim-task", [0], wallet2);
      simnet.callPublicFn("stack-tasks", "complete-task", [0], wallet2);

      const verifyBlock = simnet.callPublicFn(
        "stack-tasks",
        "verify-task",
        [0],
        wallet3
      );
      
      expect(verifyBlock.result).toBeOk(true);
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [0],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task["verified-count"]).toBeUint(1);
    });

    it("distributes reward after reaching verification threshold", () => {
      // Claim and complete the task
      simnet.callPublicFn("stack-tasks", "claim-task", [0], wallet2);
      simnet.callPublicFn("stack-tasks", "complete-task", [0], wallet2);

      // Get initial balance
      const initialBalance = simnet.getAssetsMap().get(wallet2)?.get("STX") || 0;

      // Get three different wallets to verify
      simnet.callPublicFn("stack-tasks", "verify-task", [0], wallet3);
      simnet.callPublicFn("stack-tasks", "verify-task", [0], wallet4);
      const finalVerifyBlock = simnet.callPublicFn(
        "stack-tasks",
        "verify-task",
        [0],
        wallet1
      );

      expect(finalVerifyBlock.result).toBeOk(true);

      // Check if reward was transferred
      const finalBalance = simnet.getAssetsMap().get(wallet2)?.get("STX") || 0;
      expect(finalBalance).toBe(initialBalance + reward);
    });
  });

  describe("Task Cancellation", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
    });

    it("successfully cancels unclaimed task", () => {
      const cancelBlock = simnet.callPublicFn(
        "stack-tasks",
        "cancel-task",
        [0],
        wallet1
      );
      
      expect(cancelBlock.result).toBeOk(true);
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [0],
        wallet1
      );
      
      expect(taskResult.result).toBeNone();
    });

    it("fails to cancel claimed task", () => {
      // First claim the task
      simnet.callPublicFn("stack-tasks", "claim-task", [0], wallet2);

      const cancelBlock = simnet.callPublicFn(
        "stack-tasks",
        "cancel-task",
        [0],
        wallet1
      );
      
      expect(cancelBlock.result).toBeErr(102); // err-already-claimed
    });

    it("fails to cancel task by non-owner", () => {
      const cancelBlock = simnet.callPublicFn(
        "stack-tasks",
        "cancel-task",
        [0],
        wallet2
      );
      
      expect(cancelBlock.result).toBeErr(100); // err-owner-only
    });
  });

  describe("Admin Functions", () => {
    it("successfully sets verification threshold by owner", () => {
      const block = simnet.callPublicFn(
        "stack-tasks",
        "set-verification-threshold",
        [5],
        deployer
      );
      
      expect(block.result).toBeOk(true);
      
      const thresholdResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-verification-threshold",
        [],
        deployer
      );
      
      expect(thresholdResult.result).toBeOk(5);
    });

    it("fails to set verification threshold by non-owner", () => {
      const block = simnet.callPublicFn(
        "stack-tasks",
        "set-verification-threshold",
        [5],
        wallet1
      );
      
      expect(block.result).toBeErr(100); // err-owner-only
    });
  });
});