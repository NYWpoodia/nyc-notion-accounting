import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] p-6 m-4 bg-rose-50 dark:bg-stone-900 border-2 border-rose-500/40 rounded-2xl space-y-4 text-stone-800 dark:text-stone-200">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-8 h-8 shrink-0 animate-bounce" />
            <div>
              <h2 className="text-xl font-bold">เกิดข้อผิดพลาดขึ้นในระบบ (Application Error)</h2>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                ระบบพบปัญหาในการแสดงผลหน้านี้ กรุณากดปุ่มรีโหลด หรือคัดลอกรายละเอียดข้อผิดพลาดด้านล่างเพื่อแจ้งผู้พัฒนา
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl inline-flex items-center gap-2 shadow-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              รีโหลดหน้าเว็บใหม่
            </button>
            <button
              onClick={() => {
                const msg = `${this.state.error?.toString()}\n\nStack:\n${this.state.errorInfo?.componentStack}`;
                navigator.clipboard.writeText(msg);
                alert('คัดลอกรายละเอียดข้อผิดพลาดลง Clipboard แล้ว!');
              }}
              className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-sm rounded-xl"
            >
              📋 คัดลอกข้อผิดพลาด (Copy Error)
            </button>
          </div>

          <div className="p-4 bg-black/90 text-rose-300 font-mono text-xs rounded-xl overflow-x-auto max-h-[300px] border border-rose-900/50">
            <strong className="text-white block mb-1">Error Message:</strong>
            {this.state.error && this.state.error.toString()}
            <strong className="text-white block mt-3 mb-1">Component Stack:</strong>
            <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
