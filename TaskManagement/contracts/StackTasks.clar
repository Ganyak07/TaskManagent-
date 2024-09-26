;; StackTasks: Decentralized Task Management

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-claimed (err u102))
(define-constant err-not-claimed (err u103))
(define-constant err-not-claimant (err u104))

;; Data variables
(define-data-var task-nonce uint u0)

;; Define the task struct
(define-map tasks
  { task-id: uint }
  {
    creator: principal,
    description: (string-utf8 256),
    reward: uint,
    claimed-by: (optional principal),
    completed: bool
  }
)

;; Create a new task
(define-public (create-task (description (string-utf8 256)) (reward uint))
  (let
    (
      (task-id (var-get task-nonce))
    )
    (map-set tasks
      { task-id: task-id }
      {
        creator: tx-sender,
        description: description,
        reward: reward,
        claimed-by: none,
        completed: false
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
    (map-set tasks
      { task-id: task-id }
      (merge task { completed: true })
    )
    (ok true)
  )
)

;; Get task details
(define-read-only (get-task (task-id uint))
  (map-get? tasks { task-id: task-id })
)

;; Distribute reward (simplified version, to be called by off-chain script after verification)
(define-public (distribute-reward (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender contract-owner) (err err-owner-only))
    (asserts! (get completed task) (err err-not-completed))
    (let
      (
        (reward (get reward task))
        (claimant (unwrap! (get claimed-by task) (err err-not-claimed)))
      )
      (try! (stx-transfer? reward tx-sender claimant))
      (ok true)
    )
  )
)