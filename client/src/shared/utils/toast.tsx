// client/src/shared/utils/toast.tsx
import toast from 'react-hot-toast';

/**
 * 공통 토스트 유틸리티
 * 프로젝트 전체에서 일관된 알림을 제공합니다.
 */

// 기본 옵션 (모든 토스트에 적용)
const defaultOptions = {
  duration: 3000,
  position: 'top-center' as const,
};

// 성공 토스트
export const showSuccess = (message: string) => {
  toast.success(message, {
    ...defaultOptions,
    icon: '✅',
    style: {
      background: '#10b981',
      color: '#fff',
      fontWeight: '600',
    },
  });
};

// 에러 토스트
export const showError = (message: string) => {
  toast.error(message, {
    ...defaultOptions,
    duration: 4000, // 에러는 조금 더 길게
    icon: '❌',
    style: {
      background: '#ef4444',
      color: '#fff',
      fontWeight: '600',
    },
  });
};

// 정보 토스트
export const showInfo = (message: string) => {
  toast(message, {
    ...defaultOptions,
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '600',
    },
  });
};

// 경고 토스트
export const showWarning = (message: string) => {
  toast(message, {
    ...defaultOptions,
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
      fontWeight: '600',
    },
  });
};

// 로딩 토스트
export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: '#6b7280',
      color: '#fff',
      fontWeight: '600',
    },
  });
};

// 로딩 완료 (성공으로 전환)
export const dismissLoading = (toastId: string, successMessage?: string) => {
  toast.dismiss(toastId);
  if (successMessage) {
    showSuccess(successMessage);
  }
};

/**
 * 확인이 필요한 토스트 (Promise 패턴)
 * @returns Promise<boolean> - 확인: true, 취소: false
 */
export const showConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div style={{ minWidth: '240px', padding: '4px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1f2937',
              marginBottom: '14px',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {message}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              취소
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              확인
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
        style: {
          background: '#ffffff',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        },
      },
    );
  });
};

// 모든 토스트 제거
export const dismissAll = () => {
  toast.dismiss();
};
