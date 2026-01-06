// src/shared/ui/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트 합니다.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 리포팅 서비스에 에러를 기록할 수도 있습니다.
    this.setState({ error, errorInfo });
    logger.error('Uncaught error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 개발 환경: 상세 에러 정보 표시
      if (import.meta.env.DEV) {
        return (
          <div className="p-10 bg-red-50 min-h-screen flex flex-col items-center justify-center text-red-900">
            <h1 className="text-3xl font-bold mb-4">앗! 오류가 발생했습니다. 🚨 (DEV)</h1>
            <div className="bg-white p-6 rounded-lg shadow-lg border border-red-200 max-w-3xl w-full overflow-auto">
              <h2 className="font-bold text-red-600 mb-2">Error Message:</h2>
              <pre className="text-sm bg-gray-100 p-4 rounded mb-4 whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
              </pre>
              <h2 className="font-bold text-red-600 mb-2">Component Stack:</h2>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors"
            >
              새로고침
            </button>
          </div>
        );
      }

      // 프로덕션 환경: 단순 안내 메시지
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-4xl font-bold mb-4 text-primary-600">Oops!</h1>
            <p className="text-lg mb-6 text-gray-600">
              일시적인 오류가 발생했습니다.
              <br />
              잠시 후 다시 시도하거나 페이지를 새로고침 해주세요.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
