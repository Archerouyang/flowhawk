/**
 * MockDataSource — in-memory mock implementation for development.
 *
 * Returns static data without hitting the backend.
 * Tracker mutations are persisted to localStorage.
 */

import type {
  ContractDashboardStats,
  ContractRankingResponse,
  DashboardSummary,
  DataSource,
  RankingDatesResponse,
  ScreenParams,
  ScreenResponse,
  SignalResponse,
  TrackerHistoryResponse,
  TrackerItem,
  TrackerListResponse,
} from "./data-source";
import {
  getMockScreen,
  getMockSignals,
  getMockDashboard,
  getMockContractRanking,
  getMockContractStats,
  getMockTrackerList,
  getMockTrackerHistory,
  addMockTracker,
  removeMockTracker,
  updateMockTracker,
} from "./mock-data";

export class MockDataSource implements DataSource {
  async screen(_params: ScreenParams): Promise<ScreenResponse> {
    return getMockScreen(_params);
  }

  async getSignals(_symbols?: string[]): Promise<SignalResponse> {
    return getMockSignals();
  }

  async getDashboard(): Promise<DashboardSummary> {
    return getMockDashboard();
  }

  async getContractRanking(category: string = "dragon_tiger"): Promise<ContractRankingResponse> {
    return getMockContractRanking(category);
  }

  async getContractStats(): Promise<ContractDashboardStats> {
    return getMockContractStats();
  }

  async getHistoricalRanking(
    _snapshotDate: string,
    category: string = "dragon_tiger",
  ): Promise<ContractRankingResponse> {
    // In mock mode, always return today's data regardless of date
    return getMockContractRanking(category);
  }

  async getRankingDates(): Promise<RankingDatesResponse> {
    const today = new Date().toISOString().split("T")[0];
    return { dates: [today] };
  }

  async getTracker(_status?: string): Promise<TrackerListResponse> {
    return getMockTrackerList();
  }

  async addTracker(params: {
    contract_code: string;
    underlying: string;
    option_type: string;
    strike: number;
    expiration: string;
    notes?: string;
  }): Promise<TrackerItem> {
    return addMockTracker(params);
  }

  async removeTracker(contract_code: string): Promise<{ removed: boolean; contract_code: string }> {
    return removeMockTracker(contract_code);
  }

  async getTrackerHistory(contract_code: string, _limit?: number): Promise<TrackerHistoryResponse> {
    return getMockTrackerHistory(contract_code);
  }

  async updateTracker(
    contract_code: string,
    updates: { notes?: string; status?: string },
  ): Promise<TrackerItem> {
    return updateMockTracker(contract_code, updates);
  }
}
