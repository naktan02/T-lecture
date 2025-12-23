"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/infra/kakao.service.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../config/logger"));
const AppError_1 = require("../common/errors/AppError");
class KakaoService {
    kakaoApiKey;
    baseUrl;
    constructor() {
        this.kakaoApiKey = process.env.KAKAO_REST_API_KEY || '';
        if (!this.kakaoApiKey) {
            throw new AppError_1.AppError('KAKAO_REST_API_KEY is not set', 500, 'KAKAO_API_KEY_MISSING');
        }
        this.baseUrl = 'https://apis-navi.kakaomobility.com/v1';
    }
    // 출발-도착지 사이의 거리 계산
    async getRouteDistance(originLat, originLng, destLat, destLng) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/directions`, {
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
                throw new AppError_1.AppError('No route found', 404, 'KAKAO_ROUTE_NOT_FOUND');
            }
            const summary = route.summary;
            return {
                distance: summary.distance,
                duration: summary.duration,
                route,
            };
        }
        catch (err) {
            if (err instanceof AppError_1.AppError)
                throw err;
            const axiosError = err;
            logger_1.default.error(`Kakao API Error: ${axiosError.response?.data || axiosError.message}`);
            throw new AppError_1.AppError('카카오 경로 API 호출에 실패했습니다.', 500, 'KAKAO_API_ERROR');
        }
    }
    // 주소를 좌표로 변환
    async addressToCoordinates(address) {
        try {
            const response = await axios_1.default.get('https://dapi.kakao.com/v2/local/search/address.json', {
                params: { query: address },
                headers: {
                    Authorization: `KakaoAK ${this.kakaoApiKey}`,
                },
            });
            const doc = response.data?.documents?.[0];
            if (!doc) {
                throw new AppError_1.AppError('Address not found', 404, 'KAKAO_ADDRESS_NOT_FOUND');
            }
            return {
                lat: parseFloat(doc.y),
                lng: parseFloat(doc.x),
                address: doc.address_name,
            };
        }
        catch (err) {
            if (err instanceof AppError_1.AppError)
                throw err;
            const axiosError = err;
            logger_1.default.error(`Kakao Address API Error: ${axiosError.response?.data || axiosError.message}`);
            throw new AppError_1.AppError('카카오 주소 API 호출에 실패했습니다.', 500, 'KAKAO_ADDRESS_API_ERROR');
        }
    }
}
exports.default = new KakaoService();
