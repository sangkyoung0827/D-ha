export interface WellnessCondition {
  source: "local-demo";
  label: string;
  value: number;
}

export interface WellnessActivity {
  id: string;
  label: string;
  occurredAt: string;
}

export interface WellnessProvider {
  getDailyCondition(): Promise<WellnessCondition>;
  getRecentActivities(): Promise<WellnessActivity[]>;
}

export class MockWellnessProvider implements WellnessProvider {
  async getDailyCondition(): Promise<WellnessCondition> {
    return { source: "local-demo", label: "게임 데모 컨디션", value: 76 };
  }
  async getRecentActivities(): Promise<WellnessActivity[]> {
    return [];
  }
}
