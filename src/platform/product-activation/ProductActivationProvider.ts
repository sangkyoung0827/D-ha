export interface ProductActivationInput {
  code: string;
}

export interface ProductActivationResult {
  status: "not-connected";
  message: string;
}

export interface ProductActivationProvider {
  activateProduct(input: ProductActivationInput): Promise<ProductActivationResult>;
}

export class MockProductActivationProvider implements ProductActivationProvider {
  async activateProduct(): Promise<ProductActivationResult> {
    return { status: "not-connected", message: "제품 활성화는 현재 버전에 연결되어 있지 않습니다." };
  }
}
