// server/scripts/debug-kakao.ts
import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드 (서버 루트 기준)
dotenv.config({ path: path.join(__dirname, '../.env') });

import axios from 'axios';

async function testKakaoApi() {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  console.log('🔑 API Key Check:', apiKey ? 'Loaded (Length: ' + apiKey.length + ')' : 'MISSING');

  if (!apiKey) {
    console.error('❌ KAKAO_REST_API_KEY is missing in .env');
    return;
  }

  const testAddress = '서울특별시 강남구 테헤란로 152';
  const url = 'https://dapi.kakao.com/v2/local/search/address.json';

  console.log(`📡 Testing API call for address: "${testAddress}"`);

  try {
    const response = await axios.get(url, {
      params: { query: testAddress },
      headers: {
        Authorization: `KakaoAK ${apiKey}`, // 따옴표 제거된 키 사용
      },
    });

    console.log('✅ API Response Status:', response.status);

    if (response.data && response.data.documents && response.data.documents.length > 0) {
      const doc = response.data.documents[0];
      console.log('✅ Conversion Successful!');
      console.log(`   - Address: ${doc.address_name}`);
      console.log(`   - Coordinates: (${doc.y}, ${doc.x})`);
    } else {
      console.warn('⚠️ API called successfully but no documents found.');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error('❌ API Call Failed');
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   - Error:', error.message);
    }
  }
}

testKakaoApi();
