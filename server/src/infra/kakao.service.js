// server/src/infra/kakao.service.js
const axios = require('axios');

class KakaoService {
  constructor() {
    this.kakaoApiKey = process.env.KAKAO_REST_API_KEY; 
    if (!this.kakaoApiKey) {
      throw new Error('KAKAO_REST_API_KEY is not set');
    }
    this.baseUrl = 'https://apis-navi.kakaomobility.com/v1';
  }

  async getRouteDistance(originLat, originLng, destLat, destLng) {
    try {
      const response = await axios.get(`${this.baseUrl}/directions`, {
        params: {
          origin: `${originLng},${originLat}`,
          destination: `${destLng},${destLat}`,
          priority: "RECOMMEND",
          alternatives: false,
        },
        headers: {
          Authorization: `KakaoAK ${this.kakaoApiKey}`,
        },
      });

      const route = response.data?.routes?.[0];
      if (!route) throw new Error('No route found');

      const summary = route.summary;

      return {
        distance: summary.distance,
        duration: summary.duration,
        route,
      };
    } catch (err) {
      console.error('Kakao API Error:', err.response?.data || err.message);
      throw err;
    }
  }

  async addressToCoordinates(address) {
    try {
      const response = await axios.get(
        'https://dapi.kakao.com/v2/local/search/address.json',
        {
          params: { query: address },
          headers: {
            Authorization: `KakaoAK ${this.kakaoApiKey}`, 
          },
        }
      );

      const doc = response.data?.documents?.[0];
      if (!doc) throw new Error('Address not found');

      return {
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        address: doc.address_name,
      };
    } catch (err) {
      console.error('Kakao Address API Error:', err.response?.data || err.message);
      throw err;
    }
  }
}

module.exports = new KakaoService();