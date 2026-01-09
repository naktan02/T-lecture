// server/src/infra/kakao.service.ts
import axios, { AxiosError } from 'axios';
import logger from '../config/logger';
import { AppError } from '../common/errors/AppError';
import kakaoUsageRepository from '../domains/distance/kakaoUsage.repository';

interface RouteResult {
  distance: number;
  duration: number;
  route: unknown;
}

interface CoordinatesResult {
  lat: number;
  lng: number;
  address: string;
}

class KakaoService {
  private kakaoApiKey: string;
  private baseUrl: string;

  constructor() {
    this.kakaoApiKey = process.env.KAKAO_REST_API_KEY || '';
    if (!this.kakaoApiKey) {
      throw new AppError('KAKAO_REST_API_KEY is not set', 500, 'KAKAO_API_KEY_MISSING');
    }
    this.baseUrl = 'https://apis-navi.kakaomobility.com/v1';
  }

  // 출발-도착지 사이의 거리 계산
  async getRouteDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<RouteResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/directions`, {
        params: {
          origin: `${originLng},${originLat}`,
          destination: `${destLng},${destLat}`,
          priority: 'RECOMMEND',
          alternatives: false,
        },
        headers: {
          Authorization: `KakaoAK ${this.kakaoApiKey}`,
        },
      });

      const route = response.data?.routes?.[0];
      if (!route) {
        throw new AppError('No route found', 404, 'KAKAO_ROUTE_NOT_FOUND');
      }

      const summary = route.summary;

      return {
        distance: summary.distance,
        duration: summary.duration,
        route,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const axiosError = err as AxiosError;
      logger.error(`Kakao API Error: ${axiosError.response?.data || axiosError.message}`);
      throw new AppError('카카오 경로 API 호출에 실패했습니다.', 500, 'KAKAO_API_ERROR');
    }
  }

  // 주소를 좌표로 변환 (예외 발생)
  async addressToCoordinates(address: string): Promise<CoordinatesResult> {
    try {
      const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
        params: { query: address },
        headers: {
          Authorization: `KakaoAK ${this.kakaoApiKey}`,
        },
      });

      const doc = response.data?.documents?.[0];
      if (!doc) {
        throw new AppError('Address not found', 404, 'KAKAO_ADDRESS_NOT_FOUND');
      }

      return {
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        address: doc.address_name,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const axiosError = err as AxiosError;
      logger.error(`Kakao Address API Error: ${axiosError.response?.data || axiosError.message}`);
      throw new AppError('카카오 주소 API 호출에 실패했습니다.', 500, 'KAKAO_ADDRESS_API_ERROR');
    }
  }

  /**
   * 주소를 좌표로 변환 (실패 시 null 반환 - 배치 작업용)
   */
  async addressToCoordsOrNull(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address || address.trim().length === 0) {
      return null;
    }

    try {
      const result = await this.addressToCoordinates(address);
      return { lat: result.lat, lng: result.lng };
    } catch {
      logger.warn(`[KakaoService] Geocoding failed for address: ${address}`);
      return null;
    }
  }

  /**
   * 주소를 좌표로 변환 (일일 한도 체크 + 사용량 기록)
   * @returns 좌표 or null (한도 초과 또는 변환 실패 시)
   */
  async addressToCoordsWithLimit(
    address: string,
  ): Promise<{ lat: number; lng: number; limitExceeded?: boolean } | null> {
    if (!address || address.trim().length === 0) {
      return null;
    }

    // 일일 한도 체크
    const canUse = await kakaoUsageRepository.canUseGeocode();
    if (!canUse) {
      logger.warn('[KakaoService] Daily geocode limit exceeded');
      return { lat: 0, lng: 0, limitExceeded: true };
    }

    try {
      const result = await this.addressToCoordinates(address);
      // 성공 시 사용량 증가
      await kakaoUsageRepository.incrementGeocodeCount();
      return { lat: result.lat, lng: result.lng };
    } catch {
      logger.warn(`[KakaoService] Geocoding failed for address: ${address}`);
      return null;
    }
  }

  /**
   * 여러 주소를 일괄 변환 (rate limit 고려하여 순차 처리)
   * @param addresses 주소 배열
   * @param delayMs 각 요청 간 딜레이 (기본 100ms)
   */
  async batchAddressToCoords(
    addresses: string[],
    delayMs = 100,
  ): Promise<({ lat: number; lng: number } | null)[]> {
    const results: ({ lat: number; lng: number } | null)[] = [];

    for (const address of addresses) {
      const result = await this.addressToCoordsOrNull(address);
      results.push(result);

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

export default new KakaoService();
