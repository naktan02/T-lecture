// server/src/infra/geocoding.service.ts
import axios from 'axios';

interface GeocodingResult {
  lat: number;
  lng: number;
}

class GeocodingService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dapi.kakao.com/v2/local/search/address.json';

  constructor() {
    this.apiKey = process.env.KAKAO_REST_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[GeocodingService] KAKAO_REST_API_KEY is not set');
    }
  }

  /**
   * 주소를 좌표(위도/경도)로 변환
   * @param address 검색할 주소
   * @returns { lat, lng } 또는 null (변환 실패 시)
   */
  async addressToCoords(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      console.error('[GeocodingService] API key is not configured');
      return null;
    }

    if (!address || address.trim().length === 0) {
      return null;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: { query: address },
        headers: { Authorization: `KakaoAK ${this.apiKey}` },
      });

      const documents = response.data?.documents;
      if (!documents || documents.length === 0) {
        console.warn(`[GeocodingService] No results for address: ${address}`);
        return null;
      }

      // 첫 번째 결과 사용
      const { x, y } = documents[0];
      return {
        lat: parseFloat(y),
        lng: parseFloat(x),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GeocodingService] Error geocoding address "${address}": ${message}`);
      return null;
    }
  }

  /**
   * 여러 주소를 일괄 변환 (rate limit 고려하여 순차 처리)
   * @param addresses 주소 배열
   * @param delayMs 각 요청 간 딜레이 (기본 100ms)
   * @returns 변환 결과 배열 (null 포함 가능)
   */
  async batchAddressToCoords(
    addresses: string[],
    delayMs = 100,
  ): Promise<(GeocodingResult | null)[]> {
    const results: (GeocodingResult | null)[] = [];

    for (const address of addresses) {
      const result = await this.addressToCoords(address);
      results.push(result);

      // Rate limit 방지 딜레이
      if (delayMs > 0) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new GeocodingService();
