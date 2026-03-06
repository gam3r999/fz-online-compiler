import { useState } from 'react';
import { Upload, FileCode, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function App() {
  const [cFile, setCFile] = useState<File | null>(null);
  const [famFile, setFamFile] = useState<File | null>(null);
  const [firmware, setFirmware] = useState<string>('official');
  const [compiling, setCompiling] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');

  const COMPILE_SERVER = import.meta.env.VITE_COMPILE_SERVER_URL || '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'c' | 'fam') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'c') setCFile(file);
      else setFamFile(file);
    }
  };

  const handleCompile = async () => {
    if (!cFile || !famFile) return;
    if (!COMPILE_SERVER) {
      setStatus('failed');
      setErrorMsg('VITE_COMPILE_SERVER_URL is not set in your .env file!');
      return;
    }

    setCompiling(true);
    setStatus('idle');
    setDownloadUrl('');

    try {
      const cContent   = await cFile.text();
      const famContent = await famFile.text();

      const response = await fetch(`${COMPILE_SERVER}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cFileContent: cContent,
          famFileContent: famContent,
          cFileName: cFile.name,
          firmware,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Compilation failed');
      }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const name = cFile.name.replace('.c', '.fap');

      setDownloadUrl(url);
      setDownloadName(name);
      setStatus('success');

    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
      setStatus('failed');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Package className="w-16 h-16 text-orange-500" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Flipper Zero FAP Compiler</h1>
            <p className="text-slate-300 text-lg">Compile your .c and .fam files into a ready-to-use .FAP application</p>
          </div>

          {!COMPILE_SERVER && (
            <div className="mb-6 bg-yellow-900/40 border border-yellow-600 rounded-xl p-5 text-yellow-200">
              <div className="font-bold text-yellow-400 mb-2">⚠️ Compile server not configured</div>
              <p className="text-sm">Add this to your <code className="bg-black/30 px-1 rounded">.env</code> file:</p>
              <pre className="bg-black/40 rounded p-3 text-xs font-mono mt-2">VITE_COMPILE_SERVER_URL=https://your-railway-app.up.railway.app</pre>
            </div>
          )}

          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-8 space-y-6">

              {/* C File */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <div className="flex items-center gap-2"><FileCode className="w-4 h-4" /> C Source File (.c)</div>
                </label>
                <input type="file" accept=".c" onChange={(e) => handleFileChange(e, 'c')}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 file:cursor-pointer bg-slate-700 rounded-lg border border-slate-600" />
                {cFile && <p className="mt-2 text-sm text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{cFile.name}</p>}
              </div>

              {/* FAM File */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <div className="flex items-center gap-2"><FileCode className="w-4 h-4" /> FAM Manifest File (.fam)</div>
                </label>
                <input type="file" accept=".fam" onChange={(e) => handleFileChange(e, 'fam')}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 file:cursor-pointer bg-slate-700 rounded-lg border border-slate-600" />
                {famFile && <p className="mt-2 text-sm text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{famFile.name}</p>}
              </div>

              {/* Firmware selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Target Firmware</div>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: 'official',    label: 'Official',    desc: 'Flipper Zero' },
                    { id: 'unleashed',   label: 'Unleashed',   desc: 'DarkFlippers' },
                    { id: 'roguemaster', label: 'RogueMaster', desc: 'RogueMaster'  },
                    { id: 'momentum',    label: 'Momentum',    desc: 'momentum-fw'  },
                  ].map((fw) => (
                    <button key={fw.id} onClick={() => setFirmware(fw.id)}
                      className={`p-3 rounded-lg border text-left transition-all duration-150 ${firmware === fw.id ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'}`}>
                      <div className="font-semibold text-sm">{fw.label}</div>
                      <div className="text-xs opacity-60">{fw.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compile button */}
              <button onClick={handleCompile} disabled={!cFile || !famFile || compiling}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg">
                {compiling ? <><Loader2 className="w-5 h-5 animate-spin" />Compiling...</> : <><Upload className="w-5 h-5" />Compile to FAP</>}
              </button>

              {/* Results */}
              {status === 'success' && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Compilation Successful!</h3>
                      <p className="text-slate-300 mb-4">Built for <span className="text-orange-400 font-semibold capitalize">{firmware}</span> firmware</p>
                      <a href={downloadUrl} download={downloadName}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                        <Package className="w-5 h-5" />Download {downloadName}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {status === 'failed' && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-400 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-400 mb-2">Compilation Failed</h3>
                      <p className="text-slate-300 text-sm font-mono bg-slate-900/50 p-4 rounded whitespace-pre-wrap">{errorMsg}</p>
                    </div>
                  </div>
                </div>
              )}

              {compiling && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400">Compiling your app...</h3>
                      <p className="text-slate-300 text-sm">This takes about 30 seconds ⏳</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="mt-8 text-center text-slate-400 text-sm">
            Upload your Flipper Zero app source files to compile them into a .FAP package
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
