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
(define-constant err-not-completed (err u109))
(define-constant err-list-full (err u110))

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

;; Keep track of tasks created by users
(define-map user-tasks 
  { user: principal }
  { task-ids: (list 50 uint) }
)

;; Keep track of tasks claimed by users
(define-map claimed-tasks
  { user: principal }
  { task-ids: (list 50 uint) }
)

;; Create a new task
(define-public (create-task (description (string-utf8 256)) (reward uint) (deadline uint))
  (let 
    (
      (task-id (var-get task-nonce))
      (current-user-tasks (default-to { task-ids: (list) } 
        (map-get? user-tasks { user: tx-sender })))
    )
    ;; Check all conditions first
    (if (>= (stx-get-balance tx-sender) reward)
      (if (> deadline block-height)
        (match (as-max-len? (append (get task-ids current-user-tasks) task-id) u50)
          success
            (match (stx-transfer? reward tx-sender (as-contract tx-sender))
              transferred
                (begin
                  ;; Create the task
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
                  
                  ;; Update user's task list
                  (map-set user-tasks
                    { user: tx-sender }
                    { task-ids: success }
                  )
                  
                  (var-set task-nonce (+ task-id u1))
                  (ok task-id)
                )
              error (err err-insufficient-balance)
            )
          error (err err-list-full)
        )
        (err err-past-deadline)
      )
      (err err-insufficient-balance)
    )
  )
)



;; Mark a task as completed (only claimant can complete)
(define-public (complete-task (task-id uint))
  (begin
    (let
      (
        (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
      )
      ;; Assert conditions
      (asserts! (is-eq (some tx-sender) (get claimed-by task)) (err err-not-claimant))
      (asserts! (not (get completed task)) (err err-already-completed))
      
      ;; Update task completion status
      (map-set tasks
        { task-id: task-id }
        (merge task { completed: true })
      )
      (ok true)
    )
  )
)

;; Verify a completed task
(define-public (verify-task (task-id uint))
  (begin
    (let
      (
        (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
        (verifiers (get verifiers task))
        (new-verifiers (unwrap! (as-max-len? (append verifiers tx-sender) u5) 
          (err err-invalid-verifier)))
        (new-verified-count (+ (get verified-count task) u1))
      )
      ;; Assert conditions
      (asserts! (get completed task) (err err-not-completed))
      (asserts! (not (is-eq (some tx-sender) (get claimed-by task))) (err err-not-claimant))
      (asserts! (< (len verifiers) u5) (err err-invalid-verifier))
      (asserts! (is-none (index-of verifiers tx-sender)) (err err-invalid-verifier))
      
      ;; Update task verification status
      (map-set tasks
        { task-id: task-id }
        (merge task 
          { 
            verified-count: new-verified-count,
            verifiers: new-verifiers
          }
        )
      )
      
      ;; If verification threshold is met, distribute reward
      (if (>= new-verified-count (var-get verification-threshold))
        (distribute-reward task-id)
        (ok true)
      )
    )
  )
)

;; Distribute reward (called automatically after verification threshold is met)
(define-private (distribute-reward (task-id uint))
  (begin
    (let
      (
        (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
        (reward (get reward task))
        (claimant (unwrap! (get claimed-by task) (err err-not-claimed)))
      )
      (asserts! (is-ok (as-contract (stx-transfer? reward tx-sender claimant))) 
        (err err-insufficient-balance))
      (ok true)
    )
  )
)

;; Cancel a task (only creator can cancel, and only if not claimed)
(define-public (cancel-task (task-id uint))
  (begin
    (let
      (
        (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
      )
      ;; Assert conditions
      (asserts! (is-eq tx-sender (get creator task)) (err err-owner-only))
      (asserts! (is-none (get claimed-by task)) (err err-already-claimed))
      
      ;; Return reward to creator
      (asserts! (is-ok (as-contract (stx-transfer? (get reward task) tx-sender (get creator task)))) 
        (err err-insufficient-balance))
      (map-delete tasks { task-id: task-id })
      (ok true)
    )
  )
)

;; Read-only functions

;; Get task details
(define-read-only (get-task (task-id uint))
  (map-get? tasks { task-id: task-id })
)

;; Get all tasks created by a user
(define-read-only (get-user-created-tasks (user principal))
  (let
    ((user-task-list (default-to { task-ids: (list) } 
      (map-get? user-tasks { user: user }))))
    (ok (get task-ids user-task-list))
  )
)

;; Get all tasks claimed by a user
(define-read-only (get-user-claimed-tasks (user principal))
  (let
    ((claimed-task-list (default-to { task-ids: (list) }
      (map-get? claimed-tasks { user: user }))))
    (ok (get task-ids claimed-task-list))
  )
)

;; Get current verification threshold
(define-read-only (get-verification-threshold)
  (ok (var-get verification-threshold))
)

;; Admin functions

;; Set verification threshold (only contract owner)
(define-public (set-verification-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) (err err-owner-only))
    (var-set verification-threshold new-threshold)
    (ok true)
  )
)