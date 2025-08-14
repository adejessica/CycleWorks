import { describe, it, expect, beforeEach } from "vitest";

interface RecyclingHistory {
  weight: bigint;
  material: string;
  timestamp: bigint;
  claimed: boolean;
}

interface Event {
  event_type: string;
  user: string;
  amount: bigint;
  timestamp: bigint;
  details: string;
}

interface MockContract {
  admin: string;
  paused: boolean;
  totalSupply: bigint;
  oracle: string;
  rewardRatePerKg: bigint;
  minRewardRate: bigint;
  maxRewardRate: bigint;
  lastEventId: bigint;
  balances: Map<string, bigint>;
  stakedBalances: Map<string, bigint>;
  materialRates: Map<string, bigint>;
  recyclingHistory: Map<string, RecyclingHistory>;
  events: Map<bigint, Event>;
  MAX_SUPPLY: bigint;

  isAdmin(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setRewardRate(caller: string, newRate: bigint): { value: boolean } | { error: number };
  setOracle(caller: string, newOracle: string): { value: boolean } | { error: number };
  mintTokens(caller: string, recipient: string, weight: bigint, material: string, dropOffId: bigint): { value: bigint } | { error: number };
  redeemTokens(caller: string, amount: bigint): { value: bigint } | { error: number };
  stakeTokens(caller: string, amount: bigint): { value: bigint } | { error: number };
  unstakeTokens(caller: string, amount: bigint): { value: bigint } | { error: number };
  initializeMaterialRates(caller: string): { value: boolean } | { error: number };
  getBalance(account: string): { value: bigint };
  getStakedBalance(account: string): { value: bigint };
  getRecyclingHistory(user: string, dropOffId: bigint): { value: RecyclingHistory };
  getEvent(eventId: bigint): { value: Event };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  totalSupply: 0n,
  oracle: "SP000000000000000000002Q6VF78",
  rewardRatePerKg: 100n,
  minRewardRate: 10n,
  maxRewardRate: 1000n,
  lastEventId: 0n,
  balances: new Map(),
  stakedBalances: new Map(),
  materialRates: new Map(),
  recyclingHistory: new Map(),
  events: new Map(),
  MAX_SUPPLY: 1000000000000000n,

  isAdmin(caller: string): boolean {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    this.events.set(this.lastEventId + 1n, {
      event_type: "set-paused",
      user: caller,
      amount: 0n,
      timestamp: 100n,
      details: pause ? "Contract paused" : "Contract unpaused",
    });
    this.lastEventId += 1n;
    return { value: pause };
  },

  setRewardRate(caller: string, newRate: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newRate < this.minRewardRate || newRate > this.maxRewardRate) return { error: 105 };
    this.rewardRatePerKg = newRate;
    this.events.set(this.lastEventId + 1n, {
      event_type: "set-reward-rate",
      user: caller,
      amount: newRate,
      timestamp: 100n,
      details: "Updated reward rate per kg",
    });
    this.lastEventId += 1n;
    return { value: true };
  },

  setOracle(caller: string, newOracle: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newOracle === "SP000000000000000000002Q6VF78") return { error: 104 };
    this.oracle = newOracle;
    return { value: true };
  },

  initializeMaterialRates(caller: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.materialRates.set("plastic", 100n);
    this.materialRates.set("glass", 80n);
    this.materialRates.set("paper", 60n);
    this.materialRates.set("metal", 120n);
    return { value: true };
  },

  mintTokens(caller: string, recipient: string, weight: bigint, material: string, dropOffId: bigint) {
    if (caller !== this.oracle) return { error: 100 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 104 };
    if (weight <= 0n) return { error: 102 };
    if (!this.materialRates.has(material)) return { error: 108 };
    const historyKey = `${recipient}-${dropOffId}`;
    if (this.recyclingHistory.has(historyKey)) return { error: 107 };
    const rewardRate = this.materialRates.get(material) || this.rewardRatePerKg;
    const tokenAmount = weight * rewardRate;
    if (this.totalSupply + tokenAmount > this.MAX_SUPPLY) return { error: 103 };
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + tokenAmount);
    this.totalSupply += tokenAmount;
    this.recyclingHistory.set(historyKey, { weight, material, timestamp: 100n, claimed: true });
    this.events.set(this.lastEventId + 1n, {
      event_type: "mint-tokens",
      user: recipient,
      amount: tokenAmount,
      timestamp: 100n,
      details: `Recycled ${material}`,
    });
    this.lastEventId += 1n;
    return { value: tokenAmount };
  },

  redeemTokens(caller: string, amount: bigint) {
    if (this.paused) return { error: 103 };
    if (amount <= 0n) return { error: 102 };
    const balance = this.balances.get(caller) || 0n;
    if (balance < amount) return { error: 101 };
    this.balances.set(caller, balance - amount);
    this.totalSupply -= amount;
    this.events.set(this.lastEventId + 1n, {
      event_type: "redeem-tokens",
      user: caller,
      amount,
      timestamp: 100n,
      details: "Tokens redeemed",
    });
    this.lastEventId += 1n;
    return { value: amount };
  },

  stakeTokens(caller: string, amount: bigint) {
    if (this.paused) return { error: 103 };
    if (amount <= 0n) return { error: 102 };
    const balance = this.balances.get(caller) || 0n;
    if (balance < amount) return { error: 101 };
    this.balances.set(caller, balance - amount);
    this.stakedBalances.set(caller, (this.stakedBalances.get(caller) || 0n) + amount);
    this.events.set(this.lastEventId + 1n, {
      event_type: "stake-tokens",
      user: caller,
      amount,
      timestamp: 100n,
      details: "Tokens staked",
    });
    this.lastEventId += 1n;
    return { value: amount };
  },

  unstakeTokens(caller: string, amount: bigint) {
    if (this.paused) return { error: 103 };
    if (amount <= 0n) return { error: 102 };
    const stakedBalance = this.stakedBalances.get(caller) || 0n;
    if (stakedBalance < amount) return { error: 101 };
    this.stakedBalances.set(caller, stakedBalance - amount);
    this.balances.set(caller, (this.balances.get(caller) || 0n) + amount);
    this.events.set(this.lastEventId + 1n, {
      event_type: "unstake-tokens",
      user: caller,
      amount,
      timestamp: 100n,
      details: "Tokens unstaked",
    });
    this.lastEventId += 1n;
    return { value: amount };
  },

  getBalance(account: string) {
    return { value: this.balances.get(account) || 0n };
  },

  getStakedBalance(account: string) {
    return { value: this.stakedBalances.get(account) || 0n };
  },

  getRecyclingHistory(user: string, dropOffId: bigint) {
    return {
      value: this.recyclingHistory.get(`${user}-${dropOffId}`) || {
        weight: 0n,
        material: "",
        timestamp: 0n,
        claimed: false,
      },
    };
  },

  getEvent(eventId: bigint) {
    return {
      value: this.events.get(eventId) || {
        event_type: "",
        user: "SP000000000000000000002Q6VF78",
        amount: 0n,
        timestamp: 0n,
        details: "",
      },
    };
  },
};

describe("Recycler Rewards Contract", () => {
  const user = "ST2CY5V39N7N3J2G289T1Z3TFZ5T1F5V7B3J3G7T";
  const oracle = "ST3NBRSFKX28V1SZ5J1YF4Z1E1FNT8Y7Y7T1F5V7";

  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.totalSupply = 0n;
    mockContract.oracle = oracle;
    mockContract.rewardRatePerKg = 100n;
    mockContract.balances = new Map();
    mockContract.stakedBalances = new Map();
    mockContract.materialRates = new Map();
    mockContract.recyclingHistory = new Map();
    mockContract.events = new Map();
    mockContract.lastEventId = 0n;
  });

  it("should initialize material rates by admin", () => {
    const result = mockContract.initializeMaterialRates(mockContract.admin);
    expect(result).toEqual({ value: true });
    expect(mockContract.materialRates.get("plastic")).toBe(100n);
    expect(mockContract.materialRates.get("glass")).toBe(80n);
  });

  it("should prevent non-admin from initializing material rates", () => {
    const result = mockContract.initializeMaterialRates(user);
    expect(result).toEqual({ error: 100 });
  });

  it("should set reward rate by admin", () => {
    const result = mockContract.setRewardRate(mockContract.admin, 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.rewardRatePerKg).toBe(200n);
    expect(mockContract.events.get(1n)?.details).toBe("Updated reward rate per kg");
  });

  it("should prevent invalid reward rate", () => {
    const result = mockContract.setRewardRate(mockContract.admin, 5n);
    expect(result).toEqual({ error: 105 });
  });

  it("should set oracle by admin", () => {
    const newOracle = "ST4RE5T6Y7U8I9O0P1Q2W3E4R5T6Y7U8I9O0P1Q2";
    const result = mockContract.setOracle(mockContract.admin, newOracle);
    expect(result).toEqual({ value: true });
    expect(mockContract.oracle).toBe(newOracle);
  });

  it("should mint tokens for valid recycling", () => {
    mockContract.initializeMaterialRates(mockContract.admin);
    const result = mockContract.mintTokens(oracle, user, 10n, "plastic", 1n);
    expect(result).toEqual({ value: 1000n });
    expect(mockContract.balances.get(user)).toBe(1000n);
    expect(mockContract.totalSupply).toBe(1000n);
    expect(mockContract.recyclingHistory.get(`${user}-1`)?.material).toBe("plastic");
    expect(mockContract.events.get(1n)?.event_type).toBe("mint-tokens");
  });

  it("should prevent minting by non-oracle", () => {
    const result = mockContract.mintTokens(user, user, 10n, "plastic", 1n);
    expect(result).toEqual({ error: 100 });
  });

  it("should prevent minting for invalid material", () => {
    const result = mockContract.mintTokens(oracle, user, 10n, "wood", 1n);
    expect(result).toEqual({ error: 108 });
  });

  it("should prevent duplicate drop-off claims", () => {
    mockContract.initializeMaterialRates(mockContract.admin);
    mockContract.mintTokens(oracle, user, 10n, "plastic", 1n);
    const result = mockContract.mintTokens(oracle, user, 10n, "plastic", 1n);
    expect(result).toEqual({ error: 107 });
  });

  it("should redeem tokens", () => {
    mockContract.initializeMaterialRates(mockContract.admin);
    mockContract.mintTokens(oracle, user, 10n, "plastic", 1n);
    const result = mockContract.redeemTokens(user, 500n);
    expect(result).toEqual({ value: 500n });
    expect(mockContract.balances.get(user)).toBe(500n);
    expect(mockContract.totalSupply).toBe(500n);
    expect(mockContract.events.get(2n)?.event_type).toBe("redeem-tokens");
  });

  it("should prevent redeeming when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.redeemTokens(user, 100n);
    expect(result).toEqual({ error: 103 });
  });

  it("should stake tokens", () => {
    mockContract.initializeMaterialRates(mockContract.admin);
    mockContract.mintTokens(oracle, user, 10n, "plastic", 1n);
    const result = mockContract.stakeTokens(user, 500n);
    expect(result).toEqual({ value: 500n });
    expect(mockContract.balances.get(user)).toBe(500n);
    expect(mockContract.stakedBalances.get(user)).toBe(500n);
    expect(mockContract.events.get(2n)?.event_type).toBe("stake-tokens");
  });

  it("should unstake tokens", () => {
    mockContract.initializeMaterialRates(mockContract.admin);
    mockContract.mintTokens(oracle, user, 10n, "plastic", 1n);
    mockContract.stakeTokens(user, 500n);
    const result = mockContract.unstakeTokens(user, 200n);
    expect(result).toEqual({ value: 200n });
    expect(mockContract.stakedBalances.get(user)).toBe(300n);
    expect(mockContract.balances.get(user)).toBe(700n);
    expect(mockContract.events.get(3n)?.event_type).toBe("unstake-tokens");
  });
});