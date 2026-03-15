import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Key, Check, Database } from 'lucide-react';

interface SettingsProps {
    onClose: () => void;
    onSave: (geminiKey: string, supabaseUrl: string, supabaseKey: string) => void;
}

export function Settings({ onClose, onSave }: SettingsProps) {
    const [apiKey, setApiKey] = useState('');
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [saved, setSaved] = useState(false);

    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

    useEffect(() => {
        const existingApi = localStorage.getItem('gemini_api_key');
        const existingUrl = localStorage.getItem('supabase_url');
        const existingDbKey = localStorage.getItem('supabase_key');

        if (existingApi) setApiKey(existingApi);
        if (existingUrl) setDbUrl(existingUrl);
        if (existingDbKey) setDbKey(existingDbKey);

        const handleBeforeInstallPrompt = (e: any) => {
            // デフォルトのプロンプトを防止
            e.preventDefault();
            // イベントを保存して後でトリガーできるようにする
            setInstallPromptEvent(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallApp = async () => {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            setInstallPromptEvent(null);
        }
    };

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('supabase_url', dbUrl);
        localStorage.setItem('supabase_key', dbKey);
        onSave(apiKey, dbUrl, dbKey);
        setSaved(true);
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    const copySettings = () => {
        const config = {
            gemini: apiKey,
            url: dbUrl,
            key: dbKey
        };
        navigator.clipboard.writeText(JSON.stringify(config));
        alert("設定をクリップボードにコピーしました。メモ帳などに保存しておけば、URLが変わっても簡単に復旧できます。");
    };

    const pasteSettings = () => {
        const input = prompt("コピーした設定(JSON形式)を貼り付けてください：");
        if (!input) return;
        try {
            const config = JSON.parse(input);
            if (config.gemini) setApiKey(config.gemini);
            if (config.url) setDbUrl(config.url);
            if (config.key) setDbKey(config.key);
            alert("設定を読み込みました。「保存して閉じる」を押して反映させてください。");
        } catch (e) {
            alert("設定の解析に失敗しました。正しい形式で貼り付けてください。");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <SettingsIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">設定</h2>
                                <p className="text-sm text-slate-400">連携情報の入力</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={copySettings}
                                className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 border border-slate-600 transition-colors"
                            >
                                設定をコピー
                            </button>
                            <button
                                onClick={pasteSettings}
                                className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 border border-slate-600 transition-colors"
                            >
                                設定を貼り付け
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <Key className="w-4 h-4 text-slate-400" />
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={e => { setApiKey(e.target.value); setSaved(false); }}
                                placeholder="AI StudioのAPIキー"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2 border-t border-slate-700 pt-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <Database className="w-4 h-4 text-slate-400" />
                                Supabase URL
                            </label>
                            <input
                                type="text"
                                value={dbUrl}
                                onChange={e => { setDbUrl(e.target.value); setSaved(false); }}
                                placeholder="https://xxxxx.supabase.co"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <Key className="w-4 h-4 text-slate-400" />
                                Supabase Anon Key
                            </label>
                            <input
                                type="password"
                                value={dbKey}
                                onChange={e => { setDbKey(e.target.value); setSaved(false); }}
                                placeholder="eyJh..."
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-sm"
                            />
                        </div>

                        {installPromptEvent && (
                            <div className="pt-4 border-t border-slate-700">
                                <button
                                    onClick={handleInstallApp}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold rounded-xl px-4 py-3 shadow-lg active:scale-[0.98] transition-all"
                                >
                                    📱 アプリをホーム画面に追加する
                                </button>
                                <p className="text-xs text-slate-400 text-center mt-2">
                                    より快適に、素早く起動できるようになります
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!apiKey || !dbUrl || !dbKey}
                        className={`w-full flex items-center justify-center gap-2 font-semibold rounded-xl px-4 py-3 transition-all ${saved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                            } disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
                    >
                        {saved ? (
                            <>
                                <Check className="w-5 h-5" /> 保存しました
                            </>
                        ) : (
                            '保存して閉じる'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
