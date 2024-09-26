# StackTasks: Decentralized Task Management with Proof of Completion

StackTasks is a decentralized to-do list and task management application built on the Stacks blockchain. It allows users to create tasks, set rewards in STX tokens, and have task completion verified through a simple consensus mechanism.

## Features

- Create tasks with descriptions, deadlines, and STX token rewards
- Claim and complete tasks
- Proof of completion with simple verification
- Automatic reward distribution in STX tokens
- Task NFTs for completed tasks (portfolio of achievements)

## Technology Stack

- Stacks Blockchain
- Clarity (for smart contracts)
- React (for frontend)
- Stacks.js
- Leather Wallet (for STX transactions)

## Smart Contract

The core functionality is implemented in a Clarity smart contract (`stacktasks.clar`). Key functions include:

- `create-task`: Create a new task with a description and reward
- `claim-task`: Claim an available task
- `complete-task`: Mark a task as completed
- `get-task`: Retrieve task details
- `distribute-reward`: Distribute STX reward to task completer

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/Ganyak07/TaskManagent.git
   cd stacktasks
   ```

2. Install Clarinet (if not already installed):
   Follow the instructions at [Clarinet Installation Guide](https://github.com/hirosystems/clarinet#installation)

3. Initialize the Clarinet project:
   ```
   clarinet new
   ```

4. Copy the `stacktasks.clar` contract into the `contracts` directory.

5. Test the smart contract:
   ```
   clarinet test
   ```

6. For frontend development, navigate to the `frontend` directory and install dependencies:
   ```
   cd frontend
   npm install
   ```

7. Start the frontend development server:
   ```
   npm start
   ```

## Usage

1. Connect your Leather wallet to the application.
2. Create a task by specifying a description, deadline, and STX reward.
3. Other users can view and claim available tasks.
4. Once a task is completed, the claimant can submit proof of completion.
5. After verification, the reward is automatically distributed to the completer.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Stacks Foundation
- Hiro Systems
