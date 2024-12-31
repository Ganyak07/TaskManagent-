import { describe, expect, it, beforeEach } from "vitest";
import { 
  types,
  assertEquals,
  block
} from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("StackTasks Contract Tests", () => {
  const taskDescription = types.utf8("Test task description");
  const reward = types.uint(100_000_000); // 100 STX
  const deadline = types.uint(100);

  beforeEach(() => {
    simnet.mineEmptyBlock(1);
  });

  describe("Task Creation", () => {
    it("successfully creates a task", () => {
      const block = simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
      
      expect(block.result).toBeOk(types.uint(0));
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [types.uint(0)],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task.creator).toBePrincipal(wallet1);
      expect(task.description).toStrictEqual(taskDescription);
      expect(task.reward).toStrictEqual(reward);
      expect(task.deadline).toStrictEqual(deadline);
      expect(task["claimed-by"]).toBeNone();
      expect(task.completed).toBeFalsy();
      expect(task["verified-count"]).toStrictEqual(types.uint(0));
    });

    it("fails to create task with insufficient balance", () => {
      const highReward = types.uint(1_000_000_000_000);
      const block = simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, highReward, deadline],
        wallet1
      );
      
      expect(block.result).toBeErr(types.uint(106));
    });

    it("fails to create task with past deadline", () => {
      simnet.mineEmptyBlocks(200);
      const block = simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
      
      expect(block.result).toBeErr(types.uint(107));
    });
  });

  describe("Task Completion and Verification", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
    });

    it("successfully completes a claimed task", () => {
      simnet.callPublicFn(
        "stack-tasks",
        "claim-task",
        [types.uint(0)],
        wallet2
      );

      const completeBlock = simnet.callPublicFn(
        "stack-tasks",
        "complete-task",
        [types.uint(0)],
        wallet2
      );
      
      expect(completeBlock.result).toBeOk(types.bool(true));
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [types.uint(0)],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task.completed).toBeTruthy();
    });

    it("fails to complete task by non-claimant", () => {
      simnet.callPublicFn(
        "stack-tasks",
        "claim-task",
        [types.uint(0)],
        wallet2
      );

      const completeBlock = simnet.callPublicFn(
        "stack-tasks",
        "complete-task",
        [types.uint(0)],
        wallet3
      );
      
      expect(completeBlock.result).toBeErr(types.uint(104)); // err-not-claimant
    });

    it("fails to complete already completed task", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);
      simnet.callPublicFn("stack-tasks", "complete-task", [types.uint(0)], wallet2);

      const completeBlock = simnet.callPublicFn(
        "stack-tasks",
        "complete-task",
        [types.uint(0)],
        wallet2
      );
      
      expect(completeBlock.result).toBeErr(types.uint(105)); // err-already-completed
    });

    it("successfully verifies a completed task", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);
      simnet.callPublicFn("stack-tasks", "complete-task", [types.uint(0)], wallet2);

      const verifyBlock = simnet.callPublicFn(
        "stack-tasks",
        "verify-task",
        [types.uint(0)],
        wallet3
      );
      
      expect(verifyBlock.result).toBeOk(types.bool(true));
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [types.uint(0)],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task["verified-count"]).toStrictEqual(types.uint(1));
    });

    it("fails to verify uncompleted task", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);

      const verifyBlock = simnet.callPublicFn(
        "stack-tasks",
        "verify-task",
        [types.uint(0)],
        wallet3
      );
      
      expect(verifyBlock.result).toBeErr(types.uint(109)); // err-not-completed
    });

    it("fails to verify task by claimant", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);
      simnet.callPublicFn("stack-tasks", "complete-task", [types.uint(0)], wallet2);

      const verifyBlock = simnet.callPublicFn(
        "stack-tasks",
        "verify-task",
        [types.uint(0)],
        wallet2
      );
      
      expect(verifyBlock.result).toBeErr(types.uint(104)); // err-not-claimant
    });

    it("distributes reward after reaching verification threshold", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);
      simnet.callPublicFn("stack-tasks", "complete-task", [types.uint(0)], wallet2);

      const initialBalance = simnet.getAssetsMap().get(wallet2)?.get("STX") || BigInt(0);

      simnet.callPublicFn("stack-tasks", "verify-task", [types.uint(0)], wallet3);
      simnet.callPublicFn("stack-tasks", "verify-task", [types.uint(0)], wallet4);
      const finalVerifyBlock = simnet.callPublicFn(
        "stack-tasks",
        "verify-task",
        [types.uint(0)],
        wallet1
      );

      expect(finalVerifyBlock.result).toBeOk(types.bool(true));

      const finalBalance = simnet.getAssetsMap().get(wallet2)?.get("STX") || BigInt(0);
      expect(finalBalance - initialBalance).toBe(BigInt(reward.value));
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
        [types.uint(0)],
        wallet1
      );
      
      expect(cancelBlock.result).toBeOk(types.bool(true));
      
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [types.uint(0)],
        wallet1
      );
      
      expect(taskResult.result).toBeNone();
    });

    it("fails to cancel claimed task", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);

      const cancelBlock = simnet.callPublicFn(
        "stack-tasks",
        "cancel-task",
        [types.uint(0)],
        wallet1
      );
      
      expect(cancelBlock.result).toBeErr(types.uint(102)); // err-already-claimed
    });

    it("fails to cancel task by non-owner", () => {
      const cancelBlock = simnet.callPublicFn(
        "stack-tasks",
        "cancel-task",
        [types.uint(0)],
        wallet2
      );
      
      expect(cancelBlock.result).toBeErr(types.uint(100)); // err-owner-only
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "stack-tasks",
        "create-task",
        [taskDescription, reward, deadline],
        wallet1
      );
    });

    it("successfully gets task details", () => {
      const taskResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-task",
        [types.uint(0)],
        wallet1
      );
      
      const task = taskResult.result.expectSome().expectTuple();
      expect(task.creator).toBePrincipal(wallet1);
      expect(task.description).toStrictEqual(taskDescription);
      expect(task.reward).toStrictEqual(reward);
    });

    it("successfully gets user created tasks", () => {
      const tasksResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-user-created-tasks",
        [types.principal(wallet1)],
        wallet1
      );
      
      const tasksList = tasksResult.result.expectOk().expectList();
      expect(tasksList.length).toBe(1);
      expect(tasksList[0]).toStrictEqual(types.uint(0));
    });

    it("successfully gets user claimed tasks", () => {
      simnet.callPublicFn("stack-tasks", "claim-task", [types.uint(0)], wallet2);

      const tasksResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-user-claimed-tasks",
        [types.principal(wallet2)],
        wallet2
      );
      
      const tasksList = tasksResult.result.expectOk().expectList();
      expect(tasksList.length).toBe(1);
      expect(tasksList[0]).toStrictEqual(types.uint(0));
    });
  });

  describe("Admin Functions", () => {
    it("successfully sets verification threshold by owner", () => {
      const block = simnet.callPublicFn(
        "stack-tasks",
        "set-verification-threshold",
        [types.uint(5)],
        deployer
      );
      
      expect(block.result).toBeOk(types.bool(true));
      
      const thresholdResult = simnet.callReadOnlyFn(
        "stack-tasks",
        "get-verification-threshold",
        [],
        deployer
      );
      
      const threshold = thresholdResult.result.expectOk();
      expect(threshold).toStrictEqual(types.uint(5));
    });

    it("fails to set verification threshold by non-owner", () => {
      const block = simnet.callPublicFn(
        "stack-tasks",
        "set-verification-threshold",
        [types.uint(5)],
        wallet1
      );
      
      expect(block.result).toBeErr(types.uint(100)); // err-owner-only
    });
  });
});