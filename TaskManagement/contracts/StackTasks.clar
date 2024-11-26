;; StackTasks: Enhanced Decentralized Task Management

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-claimed (err u102))
(define-constant err-not-claimed (err u103))
(define-constant err-not-claimant (err u104))
(define-constant err-already-completed (err u105))
(define-constant err-insufficient-balance (err u106))
(define-constant err-past-deadline (err u107))
(define-constant err-invalid-verifier (err u108))

;; Data variables
(define-data-var task-nonce uint u0)
(define-data-var verification-threshold uint u3)

;; Define the task struct
(define-map tasks
  { task-id: uint }
  {
    creator: principal,
    description: (string-utf8 256),
    reward: uint,
    deadline: uint,
    claimed-by: (optional principal),
    completed: bool,
    verified-count: uint,
    verifiers: (list 5 principal)
  }
)

;; Create a new task
(define-public (create-task (description (string-utf8 256)) (reward uint) (deadline uint))
  (let
    (
      (task-id (var-get task-nonce))
    )
    (asserts! (>= (stx-get-balance tx-sender) reward) (err err-insufficient-balance))
    (try! (stx-transfer? reward tx-sender (as-contract tx-sender)))
    (map-set tasks
      { task-id: task-id }
      {
        creator: tx-sender,
        description: description,
        reward: reward,
        deadline: deadline,
        claimed-by: none,
        completed: false,
        verified-count: u0,
        verifiers: (list)
      }
    )
    (var-set task-nonce (+ task-id u1))
    (ok task-id)
  )
)

;; Claim a task
(define-public (claim-task (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
    )
    (asserts! (is-none (get claimed-by task)) (err err-already-claimed))
    (asserts! (< block-height (get deadline task)) (err err-past-deadline))
    (map-set tasks
      { task-id: task-id }
      (merge task { claimed-by: (some tx-sender) })
    )
    (ok true)
  )
)

;; Mark a task as completed (only claimant can complete)
(define-public (complete-task (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
    )
    (asserts! (is-eq (some tx-sender) (get claimed-by task)) (err err-not-claimant))
    (asserts! (not (get completed task)) (err err-already-completed))
    (map-set tasks
      { task-id: task-id }
      (merge task { completed: true })
    )
    (ok true)
  )
)

;; Verify a completed task
(define-public (verify-task (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
      (verifiers (get verifiers task))
    )
    (asserts! (get completed task) (err err-not-completed))
    (asserts! (not (is-eq (some tx-sender) (get claimed-by task))) (err err-not-claimant))
    (asserts! (< (len verifiers) u5) (err err-invalid-verifier))
    (asserts! (is-none (index-of verifiers tx-sender)) (err err-invalid-verifier))
    (let
      (
        (new-verifiers (unwrap! (as-max-len? (append verifiers tx-sender) u5) (err err-invalid-verifier)))
        (new-verified-count (+ (get verified-count task) u1))
      )
      (map-set tasks
        { task-id: task-id }
        (merge task 
          { 
            verified-count: new-verified-count,
            verifiers: new-verifiers
          }
        )
      )
      (if (>= new-verified-count (var-get verification-threshold))
        (distribute-reward task-id)
        (ok true)
      )
    )
  )
)

;; Distribute reward (called automatically after verification threshold is met)
(define-private (distribute-reward (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
      (reward (get reward task))
      (claimant (unwrap! (get claimed-by task) (err err-not-claimed)))
    )
    (try! (as-contract (stx-transfer? reward tx-sender claimant)))
    (ok true)
  )
)

;; Cancel a task (only creator can cancel, and only if not claimed)
(define-public (cancel-task (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender (get creator task)) (err err-owner-only))
    (asserts! (is-none (get claimed-by task)) (err err-already-claimed))
    (try! (as-contract (stx-transfer? (get reward task) tx-sender (get creator task))))
    (map-delete tasks { task-id: task-id })
    (ok true)
  )
)

;; Get task details
(define-read-only (get-task (task-id uint))
  (map-get? tasks { task-id: task-id })
)

;; Get all tasks created by a user
(define-read-only (get-user-created-tasks (user principal))
  (filter created-by-user (map-to-list tasks))
)

;; Helper function for filtering tasks created by a user
(define-private (created-by-user (task {task-id: uint, 
    creator: principal, 
    description: (string-utf8 256), 
    reward: uint, 
    deadline: uint, 
    claimed-by: (optional principal), 
    completed: bool, 
    verified-count: uint, 
    verifiers: (list 5 principal)}))
  (is-eq (get creator task) tx-sender)
)

;; Set verification threshold (only contract owner)
(define-public (set-verification-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) (err err-owner-only))
    (var-set verification-threshold new-threshold)
    (ok true)
  )
)