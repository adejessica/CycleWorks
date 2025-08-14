;; Recycler Rewards Contract
;; Clarity v2
;; Manages $CYCLE token issuance, redemption, staking, and reward rate adjustments for recycling incentives

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-PAUSED u103)
(define-constant ERR-ZERO-ADDRESS u104)
(define-constant ERR-INVALID-REWARD-RATE u105)
(define-constant ERR-ORACLE-FAILURE u106)
(define-constant ERR-ALREADY-CLAIMED u107)
(define-constant ERR-INVALID-MATERIAL u108)

;; Token metadata
(define-constant TOKEN-NAME "Cycle Token")
(define-constant TOKEN-SYMBOL "CYCLE")
(define-constant TOKEN-DECIMALS u6)
(define-constant MAX-SUPPLY u1000000000000000) ;; 1T tokens (with decimals)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var total-supply uint u0)
(define-data-var oracle principal 'SP000000000000000000002Q6VF78) ;; Placeholder for oracle
(define-data-var reward-rate-per-kg uint u100) ;; Default: 100 tokens per kg
(define-data-var min-reward-rate uint u10)
(define-data-var max-reward-rate uint u1000)

;; Data maps
(define-map balances principal uint)
(define-map staked-balances principal uint)
(define-map recycling-history { user: principal, drop-off-id: uint } { weight: uint, material: (string-ascii 32), timestamp: uint, claimed: bool })
(define-map material-rates (string-ascii 32) uint) ;; Reward rates for different materials

;; Event logging
(define-data-var last-event-id uint u0)
(define-map events uint { event-type: (string-ascii 32), user: principal, amount: uint, timestamp: uint, details: (string-ascii 128) })

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED)))

;; Private helper: log event
(define-private (log-event (event-type (string-ascii 32)) (user principal) (amount uint) (details (string-ascii 128)))
  (let ((event-id (+ (var-get last-event-id) u1)))
    (map-set events event-id
      { event-type: event-type, user: user, amount: amount, timestamp: block-height, details: details })
    (var-set last-event-id event-id)
    (ok event-id)))

;; Initialize material reward rates
(define-public (initialize-material-rates)
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-set material-rates "plastic" u100)
    (map-set material-rates "glass" u80)
    (map-set material-rates "paper" u60)
    (map-set material-rates "metal" u120)
    (ok true)))

;; Set reward rate
(define-public (set-reward-rate (new-rate uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (and (>= new-rate (var-get min-reward-rate)) (<= new-rate (var-get max-reward-rate))) (err ERR-INVALID-REWARD-RATE))
    (var-set reward-rate-per-kg new-rate)
    (log-event "set-reward-rate" tx-sender new-rate "Updated reward rate per kg")
    (ok true)))

;; Set oracle
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-oracle 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set oracle new-oracle)
    (ok true)))

;; Mint tokens for verified recycling
(define-public (mint-tokens (recipient principal) (weight uint) (material (string-ascii 32)) (drop-off-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get oracle)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> weight u0) (err ERR-INVALID-AMOUNT))
    (asserts! (is-some (map-get? material-rates material)) (err ERR-INVALID-MATERIAL))
    (asserts! (is-none (map-get? recycling-history { user: recipient, drop-off-id: drop-off-id })) (err ERR-ALREADY-CLAIMED))
    (let
      (
        (reward-rate (default-to (var-get reward-rate-per-kg) (map-get? material-rates material)))
        (token-amount (* weight reward-rate))
        (new-supply (+ (var-get total-supply) token-amount))
      )
      (asserts! (<= new-supply MAX-SUPPLY) (err ERR-MAX-SUPPLY-REACHED))
      (map-set balances recipient (+ token-amount (default-to u0 (map-get? balances recipient))))
      (var-set total-supply new-supply)
      (map-set recycling-history { user: recipient, drop-off-id: drop-off-id }
        { weight: weight, material: material, timestamp: block-height, claimed: true })
      (log-event "mint-tokens" recipient token-amount (concat "Recycled " material))
      (ok token-amount))))

;; Redeem tokens
(define-public (redeem-tokens (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (var-set total-supply (- (var-get total-supply) amount))
      (log-event "redeem-tokens" tx-sender amount "Tokens redeemed")
      (ok amount))))

;; Stake tokens
(define-public (stake-tokens (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (map-set staked-balances tx-sender (+ amount (default-to u0 (map-get? staked-balances tx-sender))))
      (log-event "stake-tokens" tx-sender amount "Tokens staked")
      (ok amount))))

;; Unstake tokens
(define-public (unstake-tokens (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((staked-balance (default-to u0 (map-get? staked-balances tx-sender))))
      (asserts! (>= staked-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set staked-balances tx-sender (- staked-balance amount))
      (map-set balances tx-sender (+ amount (default-to u0 (map-get? balances tx-sender))))
      (log-event "unstake-tokens" tx-sender amount "Tokens unstaked")
      (ok amount))))

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (log-event "transfer-admin" new-admin u0 "Admin rights transferred")
    (ok true)))

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (log-event "set-paused" tx-sender u0 (if pause "Contract paused" "Contract unpaused"))
    (ok pause)))

;; Read-only functions
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account))))

(define-read-only (get-staked-balance (account principal))
  (ok (default-to u0 (map-get? staked-balances account))))

(define-read-only (get-total-supply)
  (ok (var-get total-supply)))

(define-read-only (get-reward-rate)
  (ok (var-get reward-rate-per-kg)))

(define-read-only (get-material-rate (material (string-ascii 32)))
  (ok (default-to (var-get reward-rate-per-kg) (map-get? material-rates material))))

(define-read-only (get-recycling-history (user principal) (drop-off-id uint))
  (ok (default-to { weight: u0, material: "", timestamp: u0, claimed: false }
        (map-get? recycling-history { user: user, drop-off-id: drop-off-id }))))

(define-read-only (get-event (event-id uint))
  (ok (default-to { event-type: "", user: 'SP000000000000000000002Q6VF78, amount: u0, timestamp: u0, details: "" }
        (map-get? events event-id))))