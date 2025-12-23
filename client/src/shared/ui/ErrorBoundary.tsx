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
      // 폴백 UI (에러 발생 시 보여줄 화면)
      return (
        <div className="p-10 bg-red-50 min-h-screen flex flex-col items-center justify-center text-red-900">
          <h1 className="text-3xl font-bold mb-4">앗! 오류가 발생했습니다. 🚨</h1>
          <p className="mb-4 text-lg">
            프론트엔드 렌더링 중 문제가 발생하여 화면을 표시할 수 없습니다.
          </p>

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
            페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
