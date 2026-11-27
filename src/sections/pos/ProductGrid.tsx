import { Search, ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { Product, Category } from '../../lib/db';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-1.5">
        <ImageOff className="h-7 w-7" />
        <span className="text-[9px] font-bold uppercase tracking-wider">No Image</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

interface ProductGridProps {
  products: Product[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddToCart: (product: Product) => void;
  onScanCode?: (code: string) => void;
  categories?: Category[];
}

export default function ProductGrid({
  products,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  onAddToCart,
  onScanCode,
  categories = []
}: ProductGridProps) {
  const { t } = useI18n();

  // Build category list from DB or fallback to product data
  const categoryNames = categories.length > 0
    ? ['All', ...categories.map(c => c.name)]
    : ['All', ...Array.from(new Set(products.map(p => p.category)))];
  
  // Filter products based on search (name, SKU, barcode, description) and selected category
  const q = searchQuery.toLowerCase().trim();
  const filteredProducts = products.filter(p => {
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col gap-6">
      
      <div className="flex items-center gap-1.5">
        <h4 className="font-bold text-slate-800 text-sm leading-none">{t('menu.pos')}</h4>
        <HelpBadge text={t('help.pos.grid')} />
      </div>

      {/* Top Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
          <input
            type="text"
            placeholder={t('pos.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onScanCode) {
                const code = searchQuery.trim();
                if (code) {
                  e.preventDefault();
                  onScanCode(code);
                  setSearchQuery('');
                }
              }
            }}
            className="w-full bg-white border border-slate-100 rounded-2xl pl-11 pr-6 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs transition-all"
          />
        </div>

        {/* Categories Tab selector */}
        <div className="flex gap-1.5 bg-slate-50 border border-slate-100 p-0.5 rounded-2xl overflow-x-auto self-start shadow-inner max-w-full scrollbar-hide">
          {categoryNames.map((cat) => {
            const catData = categories.find(c => c.name === cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeCategory === cat
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {catData ? `${catData.emoji} ` : ''}{cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Product Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 flex-1 content-start">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-100 rounded-3xl">
            <span className="font-bold text-xs">{t('pos.noProducts')}</span>
            <p className="text-[10px] text-slate-400 mt-1">{t('common.search')} · {t('common.category')}</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isOutOfStock = p.stock_quantity === 0;
            return (
              <div 
                key={p.id}
                onClick={() => !isOutOfStock && onAddToCart(p)}
                className={`bg-white border border-slate-100 rounded-3xl overflow-hidden p-3.5 shadow-xs flex flex-col justify-between transition-all duration-300 ${
                  isOutOfStock 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:border-indigo-100 hover:shadow-md hover:shadow-slate-100/50 hover:scale-[1.01]'
                }`}
              >
                <div>
                  {/* Photo with floating tags */}
                  <div className="h-32 w-full rounded-2xl overflow-hidden relative border border-slate-50 shadow-inner bg-slate-50 bg-gradient-to-br from-slate-100 to-indigo-50/20">
                    <ProductImage src={p.image_url} alt={p.name} />
                    
                    {/* Floating stock pill */}
                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide shadow-xs ${
                      isOutOfStock 
                        ? 'bg-rose-500 text-white' 
                        : p.stock_status === 'Low Stock'
                          ? 'bg-amber-500 text-white'
                          : 'bg-indigo-600 text-white'
                    }`}>
                      {isOutOfStock ? t('pos.soldOut') : `${t('pos.stockLeft')} ${p.stock_quantity}`}
                    </span>
                  </div>

                  {/* Text details */}
                  <h3 className="font-extrabold text-slate-800 text-sm mt-3 leading-snug">{p.name}</h3>
                </div>

                {/* Footer price */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">{p.category}</span>
                  <span className="font-extrabold text-slate-800 text-sm">Rp {new Intl.NumberFormat('id-ID').format(p.price)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
