import { useState } from 'react';
import { Download, FileText, ChevronLeft, Trash2, Image as ImageIcon, Search, Edit3, X } from 'lucide-react';
import type { ReceiptData } from './ReceiptForm';
import { getSupabaseClient } from '../lib/supabase';

interface ReceiptHistoryProps {
    receipts: ReceiptData[];
    onBack: () => void;
    onExport: (receiptsToExport: ReceiptData[]) => void;
    onDelete: (id: string) => void;
    onEdit: (receipt: ReceiptData) => void;
}

export function ReceiptHistory({ receipts, onBack, onExport, onDelete, onEdit }: ReceiptHistoryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const getImageUrl = (path: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) return '';
        const { data } = supabase.storage.from('receipts').getPublicUrl(path);
        return data.publicUrl;
    };

    const filteredReceipts = receipts.filter(receipt => {
        const query = searchQuery.toLowerCase();
        return (
            receipt.description.toLowerCase().includes(query) ||
            receipt.amount.toString().includes(query) ||
            receipt.date.includes(query) ||
            receipt.debitAccount.toLowerCase().includes(query) ||
            (receipt.currency || '').toLowerCase().includes(query) ||
            (receipt.memo || '').toLowerCase().includes(query)
        );
    });

    if (receipts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 h-[60vh] animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                    <FileText className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400">まだ保存されたデータがありません</p>
                <button
                    onClick={onBack}
                    className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
                >
                    ホームに戻る
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    戻る
                </button>
                <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    {filteredReceipts.length} 件のデータ
                </span>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="店名・金額・年月等で検索..."
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-slate-600"
                />
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {filteredReceipts.map((receipt, index) => (
                    <div key={index} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:bg-slate-800">
                        <div className="flex justify-between items-start border-b border-slate-700/50 pb-2">
                            <div className="flex-1">
                                <p className="text-xs text-slate-400">{receipt.date}</p>
                                <p className="font-medium text-slate-200 mt-1 flex items-center gap-2">
                                    {receipt.isVoucher && <span className="text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">伝票</span>}
                                    {receipt.description || '名称未設定'}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-2">
                                <p className="font-bold text-lg text-emerald-400 tracking-wider">
                                    {receipt.currency && receipt.currency !== 'JPY' ? `${receipt.currency} ` : '¥'}{receipt.amount.toLocaleString()}
                                </p>
                                <div className="flex items-center gap-1">
                                    {receipt.imagePath && (
                                        <button
                                            onClick={() => setViewingImage(receipt.imagePath!)}
                                            className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                                            title="画像を表示"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onEdit(receipt)}
                                        className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                                        title="編集"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => receipt.id ? onDelete(receipt.id) : null}
                                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                        title="削除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {receipt.memo && (
                            <p className="text-xs text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-700/30 italic">
                                {receipt.memo}
                            </p>
                        )}
                        <div className="flex justify-between text-xs items-center opacity-80">
                            <span className="text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">借: {receipt.debitAccount}</span>
                            <span className="text-slate-500 px-2 py-1 rounded border border-slate-700">貸: {receipt.creditAccount}</span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => onExport(filteredReceipts)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl px-4 py-4 shadow-lg active:scale-[0.98] transition-all"
            >
                <Download className="w-5 h-5" />
                表示中のデータ（{filteredReceipts.length}件）をCSV出力
            </button>

            {/* Image Modal */}
            {viewingImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative max-w-lg w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingImage(null)}
                            className="absolute -top-14 right-0 text-white hover:text-slate-300 p-2 bg-slate-800/50 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={getImageUrl(viewingImage)}
                            alt="Receipt Full View"
                            className="w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-2xl border border-slate-700"
                        />
                        <div className="mt-6 flex justify-center w-full">
                            <a
                                href={getImageUrl(viewingImage)}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white w-full px-6 py-3.5 rounded-xl font-medium transition-colors shadow-lg"
                                onClick={() => setViewingImage(null)}
                            >
                                <Download className="w-5 h-5" />
                                画像を写真に保存する
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
