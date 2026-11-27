import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Menangkap error render agar aplikasi tidak blank putih,
 * dan menampilkan pesan + tombol pulihkan.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Bantu debugging
    console.error('Render error:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    try { window.location.reload(); } catch {}
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-rose-100 rounded-2xl p-6 shadow-sm text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-3">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="font-extrabold text-slate-800 text-base">Terjadi Kesalahan</h2>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Halaman ini gagal dimuat. Coba lagi, atau muat ulang aplikasi.
            </p>
            <pre className="mt-3 text-left text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={this.handleReset} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                Coba Lagi
              </button>
              <button onClick={this.handleReload} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
