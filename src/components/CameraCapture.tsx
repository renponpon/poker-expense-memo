import { Camera, Upload, Receipt, Layers, Check, X } from 'lucide-react';
import { useState } from 'react';

interface CameraCaptureProps {
    onCapture: (files: File[], isBatch: boolean) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
    const [isContinuous, setIsContinuous] = useState(false);
    const [queue, setQueue] = useState<File[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (isContinuous) {
            setQueue(prev => [...prev, ...files]);
        } else {
            onCapture([files[0]], false);
        }
        e.target.value = '';
    };

    const handleProcessQueue = () => {
        if (queue.length > 0) {
            onCapture(queue, true);
            setQueue([]);
        }
    };

    const removeFile = (index: number) => {
        setQueue(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md mx-auto py-8 mb-20">
            <div className="text-center space-y-3">
                <Receipt className="w-16 h-16 mx-auto text-emerald-400 mb-6" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    レシート提出
                </h1>
                <p className="text-slate-400">確定申告用のデータを自動作成します</p>

                <div className="mt-6 flex items-center justify-center gap-2 pb-2">
                    <button
                        onClick={() => setIsContinuous(!isContinuous)}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${isContinuous ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                    >
                        <Layers className="w-5 h-5" />
                        連続撮影モード
                        <div className={`ml-2 w-9 h-5 rounded-full p-0.5 transition-colors ${isContinuous ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isContinuous ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>
                </div>
            </div>

            <div className="relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <label className="relative flex flex-col items-center justify-center w-full aspect-square bg-slate-800/80 backdrop-blur-sm rounded-[2rem] border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-all shadow-xl hover:shadow-emerald-500/10">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-4">
                        <div className="p-4 bg-emerald-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                            <Camera className="w-12 h-12 text-emerald-400" />
                        </div>
                        <p className="text-xl font-semibold text-slate-200">カメラで撮影</p>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                            <Upload className="w-4 h-4" /> または画像を選ぶ
                        </p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        multiple={isContinuous}
                        onChange={handleFileChange}
                    />
                </label>
            </div>

            {/* Queue UI for Continuous Mode */}
            {isContinuous && queue.length > 0 && (
                <div className="w-full mt-4 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-3 text-slate-300 font-medium">
                        <span>撮影済みプレビュー</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">{queue.length}枚</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                        {queue.map((file, i) => (
                            <div key={i} className="relative flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden snap-center border border-slate-700 shadow-md">
                                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover opacity-80" />
                                <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/60 text-white hover:text-red-400 rounded-full p-1.5 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-1">
                                    {i + 1}枚目
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleProcessQueue}
                        className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl px-4 py-3.5 transition-all shadow-lg active:scale-[0.98]"
                    >
                        <Check className="w-6 h-6" />
                        {queue.length}枚をAI一括処理＆保存
                    </button>
                    <p className="text-xs text-slate-400 text-center mt-3">自動で「事業主借」として一旦DBに登録されます</p>
                </div>
            )}
        </div>
    );
}
