# CycleWorks

A blockchain-powered platform that incentivizes consumers to recycle materials and enables manufacturers to verify and use recycled inputs, creating a transparent and rewarding circular economy ecosystem.

---

## Overview

CycleWorks leverages Web3 to address the inefficiencies in recycling systems by rewarding consumers for returning recyclable materials and ensuring manufacturers can transparently verify the use of recycled inputs. The platform uses tokenized rewards and immutable blockchain records to foster trust and accountability in the circular economy.

The platform consists of four main smart contracts written in Clarity for the Stacks blockchain:

1. **Recycler Rewards Contract** – Issues and distributes tokens to consumers for recycling materials.
2. **Material Provenance Contract** – Tracks the origin and journey of recycled materials on-chain.
3. **Manufacturer Verification Contract** – Verifies the use of recycled inputs in production and issues certifications.
4. **Treasury Management Contract** – Manages funds and token distributions across the ecosystem.

---

## Problem Statement

- **Low Recycling Participation**: Many consumers lack incentives to recycle consistently, leading to low recycling rates globally (e.g., only ~9% of plastic waste is recycled worldwide).
- **Opaque Supply Chains**: Manufacturers struggle to prove the use of recycled materials, reducing trust in "sustainable" products.
- **Inefficient Reward Systems**: Existing recycling reward programs are centralized, prone to fraud, and lack transparency.

CycleWorks solves these by:
- Tokenizing rewards to incentivize consumer recycling.
- Providing immutable provenance records for recycled materials.
- Enabling manufacturers to certify recycled input usage transparently.

---

## Features

- **Recycler Tokens**: Consumers earn $CYCLE tokens for verified recycling drop-offs, redeemable for goods or services.
- **Material Provenance Tracking**: Blockchain records trace recyclable materials from collection to reuse, ensuring transparency.
- **Certified Recycled Products**: Manufacturers receive on-chain certifications for using verified recycled inputs, boosting consumer trust.
- **Transparent Fund Management**: All token and fund flows are tracked and auditable via the blockchain.
- **Decentralized Verification**: Oracles and IoT integration validate recycling drop-offs and material usage without intermediaries.

---

## Smart Contracts

### 1. Recycler Rewards Contract
- **Purpose**: Manages the issuance, distribution, and redemption of $CYCLE tokens to incentivize consumer recycling.
- **Key Functions**:
  - `mint-tokens`: Mints $CYCLE tokens for verified recycling drop-offs (via oracle or IoT check-in).
  - `redeem-tokens`: Allows consumers to redeem tokens for rewards (e.g., discounts, products).
  - `stake-tokens`: Enables staking for bonus rewards or governance in future DAOs.
- **Data Structures**:
  - Tracks user balances and recycling history.
  - Stores reward rates (e.g., tokens per kg of plastic, glass, etc.).

### 2. Material Provenance Contract
- **Purpose**: Records the journey of recyclable materials from collection to reuse, ensuring transparency.
- **Key Functions**:
  - `register-material`: Logs material type, weight, and origin at recycling centers.
  - `update-material-status`: Updates material status (e.g., collected, processed, delivered) via oracle inputs.
  - `query-provenance`: Allows users to trace a material’s journey by ID.
- **Data Structures**:
  - Stores material IDs, timestamps, and supply chain events.
  - Links materials to final products for end-to-end traceability.

### 3. Manufacturer Verification Contract
- **Purpose**: Verifies and certifies manufacturers’ use of recycled materials, issuing on-chain certifications.
- **Key Functions**:
  - `verify-recycled-input`: Confirms recycled material usage via provenance contract and oracle data.
  - `issue-certification`: Mints a soulbound NFT certifying a product’s recycled content.
  - `check-certification`: Allows consumers to verify product certifications via QR codes or dApp.
- **Data Structures**:
  - Stores certification records and links to material provenance data.
  - Tracks manufacturer profiles and verification history.

### 4. Treasury Management Contract
- **Purpose**: Manages funds and token distributions across the ecosystem, ensuring transparency.
- **Key Functions**:
  - `distribute-rewards`: Routes $CYCLE tokens to recyclers based on verified drop-offs.
  - `fund-manufacturer`: Allocates payments to manufacturers for verified recycled inputs.
  - `audit-transactions`: Provides a public log of all fund and token flows.
- **Data Structures**:
  - Tracks token supply and treasury balance.
  - Logs transaction history for auditing.

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started):
   ```bash
   npm install -g @hirosystems/clarinet
   ```
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/cycleworks.git
   ```
3. Navigate to the project directory and run tests:
   ```bash
   cd cycleworks
   clarinet test
   ```
4. Deploy contracts to the Stacks blockchain:
   ```bash
   clarinet deploy
   ```

---

## Usage

Each smart contract is designed to operate independently but integrates seamlessly to create a cohesive circular economy ecosystem. Below is an example workflow:

1. **Consumer Recycling**:
   - A consumer drops off recyclables at a participating center.
   - An IoT device or oracle verifies the drop-off and triggers the `Recycler Rewards Contract` to mint $CYCLE tokens.
   - The consumer can redeem tokens via the `redeem-tokens` function.

2. **Material Tracking**:
   - The recycling center logs the material in the `Material Provenance Contract` with details (e.g., 10kg of PET plastic).
   - As the material moves (e.g., to a processing plant), the `update-material-status` function logs each step.

3. **Manufacturer Certification**:
   - A manufacturer uses verified recycled materials, confirmed by the `Manufacturer Verification Contract`.
   - The contract issues a soulbound NFT certification, linked to the material’s provenance record.

4. **Fund Management**:
   - The `Treasury Management Contract` distributes $CYCLE tokens to recyclers and payments to manufacturers.
   - All transactions are logged for public auditing.

Refer to individual contract documentation for detailed function calls, parameters, and usage examples.

---

## Example Clarity Code Snippet

Below is a simplified example of the `Recycler Rewards Contract` in Clarity:

```clarity
(define-fungible-token cycle-token)
(define-data-var reward-rate uint u100) ;; Tokens per kg of recyclable
(define-map user-balances principal uint)

(define-public (mint-tokens (recipient principal) (weight uint))
  (let ((token-amount (* weight (var-get reward-rate))))
    (ft-mint? cycle-token token-amount recipient)
    (map-set user-balances recipient
             (+ (default-to u0 (map-get? user-balances recipient)) token-amount))
    (ok token-amount)))

(define-public (redeem-tokens (amount uint) (recipient principal))
  (begin
    (asserts! (>= (default-to u0 (map-get? user-balances recipient)) amount) (err u1))
    (ft-transfer? cycle-token amount recipient tx-sender)
    (map-set user-balances recipient
             (- (default-to u0 (map-get? user-balances recipient)) amount))
    (ok amount)))
```

This is a basic example; full implementations would include additional security checks and oracle integrations.

---

## Future Enhancements

- **DAO Governance**: Introduce a DAO for recyclers and manufacturers to vote on reward rates or material standards.
- **Cross-Chain Integration**: Enable $CYCLE tokens to be bridged to other blockchains for broader redemption options.
- **IoT Expansion**: Integrate with smart bins for automated recycling verification.

---

## License

MIT License
