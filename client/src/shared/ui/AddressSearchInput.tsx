import React from 'react';

declare global {
  interface Window {
    daum: any;
  }
}

interface AddressSearchInputProps {
  value: string;
  onChange?: (value: string) => void; // 선택적 (onSelect만 쓸 수도 있음)
  onSelect?: (data: any) => void; // 전체 데이터 반환용
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = '주소 검색을 클릭하여 주소를 입력하세요',
  className,
  readOnly = false,
}) => {
  // Daum Postcode 스크립트 로드
  React.useEffect(() => {
    if (!window.daum) {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const handleAddressSearch = () => {
    if (readOnly) return;

    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: function (data: any) {
        // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.

        // 각 주소의 노출 규칙에 따라 주소를 조합한다.
        // 내려오는 변수가 값이 없는 경우엔 공백('')값을 가지므로, 이를 참고하여 분기 한다.
        const addr = data.roadAddress || data.jibunAddress; // 도로명 주소 또는 지번 주소

        if (onChange) onChange(addr);
        if (onSelect) onSelect(data);
      },
    }).open();
  };

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <input
        type="text"
        readOnly
        placeholder={placeholder}
        value={value}
        onClick={handleAddressSearch}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none cursor-pointer"
      />
      {!readOnly && (
        <button
          type="button"
          onClick={handleAddressSearch}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 whitespace-nowrap"
        >
          주소 검색
        </button>
      )}
    </div>
  );
};
