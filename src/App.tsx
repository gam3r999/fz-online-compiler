import { useState, useCallback } from 'react';
import {
  Upload, FileCode, Package, AlertCircle, CheckCircle, Loader2,
  Plus, X, FolderOpen, Github, Code2, Download, Wand2, ChevronDown
} from 'lucide-react';

interface ExtraFile {
  id: string;
  file: File;
  content: string | null;
}

const DEFAULT_C = `#include <furi.h>
#include <gui/gui.h>

static void draw_callback(Canvas* canvas, void* ctx) {
    UNUSED(ctx);
    canvas_clear(canvas);
    canvas_set_font(canvas, FontPrimary);
    canvas_draw_str(canvas, 20, 30, "Hello, Flipper!");
}

static void input_callback(InputEvent* input_event, void* ctx) {
    FuriMessageQueue* queue = ctx;
    furi_message_queue_put(queue, input_event, FuriWaitForever);
}

int32_t my_app_main(void* p) {
    UNUSED(p);
    FuriMessageQueue* queue = furi_message_queue_alloc(8, sizeof(InputEvent));
    ViewPort* vp = view_port_alloc();
    view_port_draw_callback_set(vp, draw_callback, NULL);
    view_port_input_callback_set(vp, input_callback, queue);
    Gui* gui = furi_record_open(RECORD_GUI);
    gui_add_view_port(gui, vp, GuiLayerFullscreen);

    InputEvent event;
    while(furi_message_queue_get(queue, &event, FuriWaitForever) == FuriStatusOk) {
        if(event.type == InputTypeShort && event.key == InputKeyBack) break;
    }

    gui_remove_view_port(gui, vp);
    furi_record_close(RECORD_GUI);
    view_port_free(vp);
    furi_message_queue_free(queue);
    return 0;
}
`;

const DEFAULT_FAM = `App(
    appid          = "my_app",
    name           = "My App",
    apptype        = FlipperAppType.EXTERNAL,
    entry_point    = "my_app_main",
    requires       = ["gui"],
    stack_size     = 2 * 1024,
    fap_category   = "Misc",
    fap_description= "My cool app",
    fap_author     = "YourName",
    fap_version    = "1.0",
)
`;

function generateFam(appName: string, entryPoint: string, category: string, author: string, description: string, version: string, stackKb: number): string {
  return `App(
    appid          = "${appName.toLowerCase().replace(/\s+/g, '_')}",
    name           = "${appName}",
    apptype        = FlipperAppType.EXTERNAL,
    entry_point    = "${entryPoint}",
    requires       = ["gui"],
    stack_size     = ${stackKb} * 1024,
    fap_category   = "${category}",
    fap_description= "${description}",
    fap_author     = "${author}",
    fap_version    = "${version}",
)
`;
}

function App() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'c' | 'fam'>('c');
  const [showFamGenerator, setShowFamGenerator] = useState(false);

  const [cCode, setCCode] = useState(DEFAULT_C);
  const [famCode, setFamCode] = useState(DEFAULT_FAM);

  const [famAppName, setFamAppName] = useState('My App');
  const [famEntry, setFamEntry] = useState('my_app_main');
  const [famCategory, setFamCategory] = useState('Misc');
  const [famAuthor, setFamAuthor] = useState('YourName');
  const [famDesc, setFamDesc] = useState('My cool app');
  const [famVersion, setFamVersion] = useState('1.0');
  const [famStack, setFamStack] = useState(2);

  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([]);

  const [mode, setMode] = useState<'files' | 'git'>('files');
  const [cFile, setCFile] = useState<File | null>(null);
  const [famFile, setFamFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [firmware, setFirmware] = useState('unleashed');

  const [compiling, setCompiling] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');

  const COMPILE_SERVER = import.meta.env.VITE_COMPILE_SERVER_URL || '';

  const isBinaryFile = (file: File) =>
    file.type.startsWith('image/') || /\.(png|jpg|jpeg|bmp|gif)$/i.test(file.name);

  const processFiles = async (files: File[]): Promise<ExtraFile[]> =>
    Promise.all(files.map(async (file) => {
      const content = isBinaryFile(file)
        ? await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(',')[1]);
            r.onerror = () => rej(new Error('read failed'));
            r.readAsDataURL(file);
          })
        : await file.text();
      return { id: Math.random().toString(36).slice(2), file, content };
    }));

  const handleExtraFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const processed = await processFiles(files);
    setExtraFiles(prev => [...prev, ...processed]);
    e.target.value = '';
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).map(
      f => new File([f], (f as any).webkitRelativePath || f.name, { type: f.type })
    );
    const processed = await processFiles(files);
    setExtraFiles(prev => [...prev, ...processed]);
    e.target.value = '';
  };

  const handleLegacyFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'c' | 'fam') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'c') setCFile(file); else setFamFile(file);
  };

  const removeExtra = (id: string) => setExtraFiles(prev => prev.filter(f => f.id !== id));

  const getFileIcon = (name: string) => {
    if (name.endsWith('.h')) return '📄';
    if (name.endsWith('.c')) return '📝';
    if (name.match(/\.(png|jpg|jpeg|bmp)/)) return '🖼️';
    return '📁';
  };

  const autoGenerateFam = () => {
    setFamCode(generateFam(famAppName, famEntry, famCategory, famAuthor, famDesc, famVersion, famStack));
    setShowFamGenerator(false);
  };

  const handleCompile = useCallback(async () => {
    if (!COMPILE_SERVER) {
      setStatus('failed');
      setErrorMsg('VITE_COMPILE_SERVER_URL is not set in your .env file!');
      return;
    }
    setCompiling(true);
    setStatus('idle');
    setDownloadUrl('');
    setDownloadName('');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 360000);
      let response: Response;

      if (editorOpen) {
        const appName = (famCode.match(/appid\s*=\s*["']([^"']+)["']/) || [])[1] || 'my_app';
        response = await fetch(`${COMPILE_SERVER}/compile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            cFileContent: cCode,
            famFileContent: famCode,
            cFileName: `${appName}.c`,
            firmware,
            extraFiles: extraFiles.map(f => ({ name: f.file.name, content: f.content, isBinary: isBinaryFile(f.file) })),
          }),
        });
        clearTimeout(timeout);
        if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Compilation failed'); }
        const blob = await response.blob();
        setDownloadUrl(URL.createObjectURL(blob));
        setDownloadName(`${appName}.fap`);
        setStatus('success');
      } else if (mode === 'git') {
        response = await fetch(`${COMPILE_SERVER}/compile-git`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ gitUrl: gitUrl.trim(), firmware }),
        });
        clearTimeout(timeout);
        if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Compilation failed'); }
        const blob = await response.blob();
        const name = (gitUrl.split('/').pop()?.replace('.git', '') || 'app') + '.fap';
        setDownloadUrl(URL.createObjectURL(blob));
        setDownloadName(name);
        setStatus('success');
      } else {
        if (!cFile) throw new Error('No .c file selected');
        let cContent = await cFile.text();
        let famContent = famFile ? await famFile.text() : '';
        if (cContent.includes('App(') || cContent.includes('appid=')) [cContent, famContent] = [famContent, cContent];
        response = await fetch(`${COMPILE_SERVER}/compile`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            cFileContent: cContent, famFileContent: famContent, cFileName: cFile.name, firmware,
            extraFiles: extraFiles.map(f => ({ name: f.file.name, content: f.content, isBinary: isBinaryFile(f.file) })),
          }),
        });
        clearTimeout(timeout);
        if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Compilation failed'); }
        const blob = await response.blob();
        setDownloadUrl(URL.createObjectURL(blob));
        setDownloadName(cFile.name.replace('.c', '.fap'));
        setStatus('success');
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
      setStatus('failed');
    } finally {
      setCompiling(false);
    }
  }, [COMPILE_SERVER, editorOpen, cCode, famCode, firmware, extraFiles, mode, gitUrl, cFile, famFile]);

  const canCompile = editorOpen ? cCode.trim().length > 0 : mode === 'git' ? gitUrl.trim() !== '' : cFile !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* Nav */}
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 text-white font-bold tracking-wide">
            <Package className="w-5 h-5 text-orange-500" />
            <span className="text-orange-500">FZ</span> Compiler
          </div>
          <button
            onClick={() => { setEditorOpen(o => !o); setStatus('idle'); setDownloadUrl(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border ${
              editorOpen ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25' : 'border-slate-600 text-slate-300 hover:border-orange-500 hover:text-orange-400'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Code Editor
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${editorOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Flipper Zero FAP Compiler</h1>
            <p className="text-slate-400">Compile your Flipper Zero apps into ready-to-use .FAP files</p>
          </div>

          {!COMPILE_SERVER && (
            <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-5 text-yellow-200">
              <div className="font-bold text-yellow-400 mb-1">⚠️ Compile server not configured</div>
              <p className="text-sm">Add <code className="bg-black/30 px-1 rounded">VITE_COMPILE_SERVER_URL=https://your-render-app.onrender.com</code> to your <code>.env</code></p>
            </div>
          )}

          {/* ══ CODE EDITOR ══ */}
          {editorOpen && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">

              {/* Tab bar */}
              <div className="flex items-center border-b border-slate-700 bg-slate-900/60">
                <button onClick={() => setEditorTab('c')}
                  className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 ${editorTab === 'c' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  📝 main.c
                </button>
                <button onClick={() => setEditorTab('fam')}
                  className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 ${editorTab === 'fam' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  ⚙️ application.fam
                </button>
                {editorTab === 'fam' && (
                  <button onClick={() => setShowFamGenerator(o => !o)}
                    className="ml-auto mr-3 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    <Wand2 className="w-3.5 h-3.5" /> Auto Generate FAM
                  </button>
                )}
              </div>

              {/* FAM generator */}
              {editorTab === 'fam' && showFamGenerator && (
                <div className="bg-slate-900/80 border-b border-slate-700 p-5">
                  <h3 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Wand2 className="w-4 h-4" /> FAM Generator
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'App Name', value: famAppName, set: setFamAppName, placeholder: 'My App' },
                      { label: 'Entry Point', value: famEntry, set: setFamEntry, placeholder: 'my_app_main' },
                      { label: 'Category', value: famCategory, set: setFamCategory, placeholder: 'Misc' },
                      { label: 'Author', value: famAuthor, set: setFamAuthor, placeholder: 'YourName' },
                      { label: 'Description', value: famDesc, set: setFamDesc, placeholder: 'Cool app' },
                      { label: 'Version', value: famVersion, set: setFamVersion, placeholder: '1.0' },
                    ].map(({ label, value, set, placeholder }) => (
                      <div key={label}>
                        <label className="block text-xs text-slate-400 mb-1">{label}</label>
                        <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                          className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Stack (KB)</label>
                      <input type="number" value={famStack} onChange={e => setFamStack(Number(e.target.value))} min={1} max={64}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <button onClick={autoGenerateFam}
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                    <Wand2 className="w-4 h-4" /> Generate & Insert
                  </button>
                </div>
              )}

              {/* Code textarea */}
              {editorTab === 'c' ? (
                <textarea value={cCode} onChange={e => setCCode(e.target.value)} spellCheck={false}
                  className="w-full h-[500px] bg-slate-950 text-green-300 font-mono text-sm p-5 resize-none focus:outline-none leading-relaxed"
                  style={{ tabSize: 4 }}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const s = e.currentTarget, start = s.selectionStart, end = s.selectionEnd;
                      s.value = s.value.substring(0, start) + '    ' + s.value.substring(end);
                      s.selectionStart = s.selectionEnd = start + 4;
                      setCCode(s.value);
                    }
                  }}
                />
              ) : (
                <textarea value={famCode} onChange={e => setFamCode(e.target.value)} spellCheck={false}
                  className="w-full h-[260px] bg-slate-950 text-yellow-300 font-mono text-sm p-5 resize-none focus:outline-none leading-relaxed" />
              )}

              {/* Asset files */}
              <div className="border-t border-slate-700 p-5 bg-slate-900/40">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">Extra Asset Files</span>
                  <span className="text-xs text-slate-500">(headers, images, .h .c .png…)</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs font-medium py-2 px-3 rounded-lg transition-all">
                      <Plus className="w-3.5 h-3.5" /> Add Files
                    </div>
                    <input type="file" multiple accept=".c,.h,.png,.jpg,.jpeg,.bmp" onChange={handleExtraFiles} className="hidden" />
                  </label>
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs font-medium py-2 px-3 rounded-lg transition-all">
                      <FolderOpen className="w-3.5 h-3.5" /> Add Folder
                    </div>
                    <input type="file" onChange={handleFolderUpload} className="hidden" {...{ webkitdirectory: '', directory: '' } as any} />
                  </label>
                </div>
                {extraFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {extraFiles.map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-300 flex items-center gap-2">
                          {getFileIcon(f.file.name)} {f.file.name}
                          <span className="text-slate-500">({(f.file.size / 1024).toFixed(1)} KB)</span>
                        </span>
                        <button onClick={() => removeExtra(f.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Firmware */}
              <div className="border-t border-slate-700 px-5 py-4 bg-slate-900/40">
                <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Target Firmware</p>
                <div className="flex gap-2 flex-wrap">
                  {['official','unleashed','roguemaster','momentum'].map(fw => (
                    <button key={fw} onClick={() => setFirmware(fw)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${firmware === fw ? 'border-orange-500 bg-orange-500/20 text-orange-300' : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'}`}>
                      {fw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error in editor */}
              {status === 'failed' && (
                <div className="border-t border-red-900 bg-red-950/40 px-5 py-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap overflow-auto max-h-48">{errorMsg}</pre>
                  </div>
                </div>
              )}

              {/* Compile / Download button */}
              <div className="border-t border-slate-700 p-5">
                {status === 'success' && downloadUrl ? (
                  <a href={downloadUrl} download={downloadName}
                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-green-600/25 text-lg">
                    <Download className="w-6 h-6" />
                    Download: {downloadName}
                  </a>
                ) : (
                  <button onClick={handleCompile} disabled={!canCompile || compiling}
                    className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/25 text-lg">
                    {compiling ? <><Loader2 className="w-6 h-6 animate-spin" /> Compiling...</> : <><Package className="w-6 h-6" /> Compile</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══ UPLOAD / GIT PANEL ══ */}
          {!editorOpen && (
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
              <div className="p-8 space-y-6">

                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  <button onClick={() => setMode('files')}
                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mode === 'files' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    <FileCode className="w-4 h-4" /> Upload Files
                  </button>
                  <button onClick={() => setMode('git')}
                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mode === 'git' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    <Github className="w-4 h-4" /> GitHub URL
                  </button>
                </div>

                {mode === 'git' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      <div className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub Repository URL</div>
                    </label>
                    <input type="text" value={gitUrl} onChange={e => setGitUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
                    <p className="mt-2 text-xs text-slate-500">Paste any public Flipper Zero app GitHub URL</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        <div className="flex items-center gap-2"><FileCode className="w-4 h-4" /> C Source File (.c)</div>
                      </label>
                      <input type="file" accept=".c" onChange={(e) => handleLegacyFileChange(e, 'c')}
                        className="block w-full text-sm text-slate-300 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 file:cursor-pointer bg-slate-700 rounded-lg border border-slate-600" />
                      {cFile && <p className="mt-2 text-sm text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{cFile.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        <div className="flex items-center gap-2"><FileCode className="w-4 h-4" /> FAM Manifest (.fam) <span className="text-slate-500 font-normal">(optional)</span></div>
                      </label>
                      <input type="file" accept=".fam" onChange={(e) => handleLegacyFileChange(e, 'fam')}
                        className="block w-full text-sm text-slate-300 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 file:cursor-pointer bg-slate-700 rounded-lg border border-slate-600" />
                      {famFile ? <p className="mt-2 text-sm text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{famFile.name}</p>
                        : <p className="mt-2 text-xs text-slate-500">No .fam — server will auto-generate</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        <div className="flex items-center gap-2"><Plus className="w-4 h-4" /> Extra Files <span className="text-slate-500 font-normal">(headers, images, assets)</span></div>
                      </label>
                      <div className="flex gap-2 mb-3">
                        <label className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-sm font-medium py-2.5 px-4 rounded-lg transition-all">
                            <Plus className="w-4 h-4" /> Add Files
                          </div>
                          <input type="file" multiple accept=".c,.h,.png,.jpg,.jpeg,.bmp" onChange={handleExtraFiles} className="hidden" />
                        </label>
                        <label className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-sm font-medium py-2.5 px-4 rounded-lg transition-all">
                            <FolderOpen className="w-4 h-4" /> Add Folder
                          </div>
                          <input type="file" onChange={handleFolderUpload} className="hidden" {...{ webkitdirectory: '', directory: '' } as any} />
                        </label>
                      </div>
                      {extraFiles.length > 0 && (
                        <div className="space-y-2">
                          {extraFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2">
                              <span className="text-sm text-slate-300 flex items-center gap-2">
                                {getFileIcon(f.file.name)} {f.file.name}
                                <span className="text-slate-500 text-xs">({(f.file.size / 1024).toFixed(1)} KB)</span>
                              </span>
                              <button onClick={() => removeExtra(f.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Target Firmware</div>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { id: 'official', label: 'Official', desc: 'Flipper Zero' },
                      { id: 'unleashed', label: 'Unleashed', desc: 'DarkFlippers' },
                      { id: 'roguemaster', label: 'RogueMaster', desc: 'RogueMaster' },
                      { id: 'momentum', label: 'Momentum', desc: 'momentum-fw' },
                    ].map((fw) => (
                      <button key={fw.id} onClick={() => setFirmware(fw.id)}
                        className={`p-3 rounded-lg border text-left transition-all duration-150 ${firmware === fw.id ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'}`}>
                        <div className="font-semibold text-sm">{fw.label}</div>
                        <div className="text-xs opacity-60">{fw.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {status === 'success' && downloadUrl ? (
                  <a href={downloadUrl} download={downloadName}
                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg text-base">
                    <Download className="w-5 h-5" /> Download: {downloadName}
                  </a>
                ) : (
                  <button onClick={handleCompile} disabled={!canCompile || compiling}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg">
                    {compiling ? <><Loader2 className="w-5 h-5 animate-spin" />Compiling...</>
                      : mode === 'git' ? <><Github className="w-5 h-5" />Clone & Compile</>
                      : <><Upload className="w-5 h-5" />Compile to FAP</>}
                  </button>
                )}

                {status === 'failed' && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-400 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Compilation Failed</h3>
                        <pre className="text-slate-300 text-sm font-mono bg-slate-900/50 p-4 rounded whitespace-pre-wrap overflow-auto max-h-60">{errorMsg}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {compiling && (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      <div>
                        <h3 className="text-lg font-semibold text-blue-400">
                          {mode === 'git' ? 'Cloning & compiling...' : 'Compiling your app...'}
                        </h3>
                        <p className="text-slate-300 text-sm">This takes about 30–60 seconds ⏳</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-slate-500 text-xs pb-4">
            FZ Compiler — The only free online Flipper Zero FAP compiler that actually works.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
