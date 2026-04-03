import React from 'react';
import { showWarning } from '../utils/toast';

const DAUM_POSTCODE_SCRIPT_SRC = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

let daumPostcodeLoadPromise: Promise<void> | null = null;

type DaumPostcodeInstance = {
  open: (options?: Record<string, string>) => void;
  embed: (element: HTMLElement) => void;
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete?: (data: DaumPostcodeData) => void;
        onclose?: (state: string) => void;
      }) => DaumPostcodeInstance;
    };
  }
}

export interface DaumPostcodeData {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  autoRoadAddress?: string;
  autoJibunAddress?: string;
  sido: string;
  sigungu: string;
  zonecode: string;
  bname?: string;
  buildingName?: string;
}

interface AddressSearchInputProps {
  value: string;
  onChange?: (value: string) => void;
  onSelect?: (data: DaumPostcodeData) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  buttonLabel?: string;
  readOnly?: boolean;
  layerTitle?: string;
}

const resolveSelectedAddress = (data: DaumPostcodeData): string =>
  [data.address, data.roadAddress, data.jibunAddress, data.autoRoadAddress, data.autoJibunAddress]
    .find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)
    ?.trim() ?? '';

const shouldUseLayerMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isNarrowViewport = window.matchMedia
    ? window.matchMedia('(max-width: 767px)').matches
    : window.innerWidth < 768;
  const isMobileDevice = /android|iphone|ipad|ipod/.test(userAgent) || isNarrowViewport;
  const isWebView =
    /\bwv\b/.test(userAgent) || /kakaotalk|naver|line|instagram|fb_iab|fbav/.test(userAgent);

  return isMobileDevice || isWebView;
};

const loadDaumPostcodeScript = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available.'));
  }

  if (window.daum?.Postcode) {
    return Promise.resolve();
  }

  if (daumPostcodeLoadPromise) {
    return daumPostcodeLoadPromise;
  }

  daumPostcodeLoadPromise = new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      if (window.daum?.Postcode) {
        resolve();
        return;
      }

      daumPostcodeLoadPromise = null;
      reject(new Error('Daum Postcode script did not initialize.'));
    };

    const handleError = () => {
      daumPostcodeLoadPromise = null;
      reject(new Error('Failed to load Daum Postcode script.'));
    };

    const existingScript = document.querySelector(
      `script[src="${DAUM_POSTCODE_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.daum?.Postcode || existingScript.dataset.loaded === 'true') {
        handleLoad();
        return;
      }

      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = DAUM_POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        handleLoad();
      },
      { once: true },
    );
    script.addEventListener('error', handleError, { once: true });
    document.body.appendChild(script);
  });

  return daumPostcodeLoadPromise;
};

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = '주소 검색을 클릭하여 주소를 입력하세요',
  className,
  inputClassName,
  buttonClassName,
  buttonLabel = '주소 검색',
  readOnly = false,
  layerTitle = '주소 검색',
}) => {
  const [isLayerOpen, setIsLayerOpen] = React.useState(false);
  const layerContainerRef = React.useRef<HTMLDivElement | null>(null);

  const handleComplete = React.useCallback(
    (data: DaumPostcodeData) => {
      const selectedAddress = resolveSelectedAddress(data);

      if (!selectedAddress) {
        showWarning('선택한 주소를 불러오지 못했습니다. 다시 시도해주세요.');
        return;
      }

      const normalizedData = {
        ...data,
        address: selectedAddress,
      };

      onChange?.(selectedAddress);
      onSelect?.(normalizedData);
      setIsLayerOpen(false);
    },
    [onChange, onSelect],
  );

  const handleScriptLoadError = React.useCallback(() => {
    showWarning('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
  }, []);

  React.useEffect(() => {
    loadDaumPostcodeScript().catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!isLayerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLayerOpen]);

  React.useEffect(() => {
    if (!isLayerOpen || !layerContainerRef.current || !window.daum?.Postcode) {
      return;
    }

    layerContainerRef.current.innerHTML = '';

    const postcode = new window.daum.Postcode({
      oncomplete: handleComplete,
      onclose: (state: string) => {
        if (state === 'FORCE_CLOSE') {
          setIsLayerOpen(false);
        }
      },
    });

    postcode.embed(layerContainerRef.current);
  }, [handleComplete, isLayerOpen]);

  const handleAddressSearch = async () => {
    if (readOnly) return;

    try {
      await loadDaumPostcodeScript();

      if (!window.daum?.Postcode) {
        handleScriptLoadError();
        return;
      }

      if (shouldUseLayerMode()) {
        setIsLayerOpen(true);
        return;
      }

      const postcode = new window.daum.Postcode({
        oncomplete: handleComplete,
      });

      postcode.open({ popupTitle: layerTitle });
    } catch {
      handleScriptLoadError();
    }
  };

  const mergedInputClassName = [
    'w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none cursor-pointer',
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const mergedButtonClassName = [
    'px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 whitespace-nowrap',
    buttonClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={['flex gap-2', className].filter(Boolean).join(' ')}>
        <input
          type="text"
          readOnly
          placeholder={placeholder}
          value={value}
          onClick={handleAddressSearch}
          className={mergedInputClassName}
        />
        {!readOnly && (
          <button type="button" onClick={handleAddressSearch} className={mergedButtonClassName}>
            {buttonLabel}
          </button>
        )}
      </div>

      {isLayerOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 p-4">
          <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">{layerTitle}</h3>
              <button
                type="button"
                onClick={() => setIsLayerOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                닫기
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <div ref={layerContainerRef} className="h-full w-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
