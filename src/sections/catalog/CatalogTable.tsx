import { Edit3, Trash2, ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { Product, Category } from '../../lib/db';
import { stockStatusKey } from '../../lib/labels';
import { useI18n } from '../../lib/i18n';

interface CatalogTableProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onEditClick: (product: Product) => void;
  onDeleteClick: (productId: string) => void;
  categories?: Category[];
}

function TableImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="h-11 w-11 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
        <ImageOff className="h-4 w-4 text-slate-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="h-11 w-11 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0"
    />
  );
}

export default function CatalogTable({
  products,
  onEditClick,
  onDeleteClick,
  categories = []
}: CatalogTableProps) {
  const { t } = useI18n();

  // Status badge colors
  const getStatusStyle = (product: Product) => {
    if (product.stock_quantity === 0) return 'bg-rose-50 text-rose-600';
    if (product.stock_status === 'Low Stock') return 'bg-amber-50 text-amber-600';
    return 'bg-emerald-50 text-emerald-600';
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              <th className="px-6 py-4">{t('common.product')}</th>
              <th className="px-6 py-4">{t('cat.barcode')} / {t('cat.code')}</th>
              <th className="px-6 py-4">{t('common.category')}</th>
              <th className="px-6 py-4">{t('cat.sellingPrice')}</th>
              <th className="px-6 py-4 text-center">{t('common.stock')}</th>
              <th className="px-6 py-4">{t('common.status')}</th>
              <th className="px-6 py-4 text-center">{t('common.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                  <p className="font-bold text-xs">{t('pos.noProducts')}</p>
                  <p className="text-[10px] text-slate-300 mt-1">{t('cat.searchPlaceholder')}</p>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">

                  {/* Details with image */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <TableImage src={p.image_url} alt={p.name} />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{p.unit || 'pcs'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Barcode / SKU */}
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-mono text-slate-600 block">{p.barcode || '—'}</span>
                    {p.sku && <span className="text-[10px] font-mono text-slate-400 block">{p.sku}</span>}
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
                      <span className="text-sm">
                        {categories.find(c => c.name === p.category)?.emoji || '📦'}
                      </span>
                      {p.category}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 text-xs font-extrabold text-slate-800">
                    Rp {new Intl.NumberFormat('id-ID').format(p.price)}
                  </td>

                  {/* Stock quantity (read-only; edit via Inventori) */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-800 tabular-nums">{p.stock_quantity}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{p.unit || 'pcs'}</span>
                    </div>
                  </td>

                  {/* Stock Status badges */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${getStatusStyle(p)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.stock_quantity === 0 ? 'bg-rose-500' :
                          p.stock_status === 'Low Stock' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      {t(stockStatusKey(p.stock_quantity === 0 ? 'Out of Stock' : p.stock_status))}
                    </span>
                  </td>

                  {/* Action buttons */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEditClick(p)}
                        className="h-8 w-8 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center text-slate-400 cursor-pointer transition-all shadow-xs"
                        title="Edit product"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteClick(p.id)}
                        className="h-8 w-8 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-slate-400 cursor-pointer transition-all shadow-xs"
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
