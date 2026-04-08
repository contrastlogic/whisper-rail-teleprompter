import { useRef, useState } from "react";
import { TeleprompterWindow } from "./components/TeleprompterWindow";
import type { ScriptDocument } from "./lib/scriptLoader";
import { readScriptFile } from "./lib/scriptLoader";

export default function App() {
  const [script, setScript] = useState<ScriptDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onSelectFile(file: File | null): Promise<void> {
    if (!file) {
      return;
    }

    try {
      const nextScript = await readScriptFile(file);
      if (nextScript.lines.length === 0) {
        setLoadError("The selected file is empty.");
        return;
      }
      setLoadError(null);
      setScript(nextScript);
    } catch {
      setLoadError("Unable to read this file.");
    }
  }

  return (
    <main className="app">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void onSelectFile(file);
        }}
      />

      <TeleprompterWindow script={script} />
      <div className="topStrip">
        <button type="button" className="loadButton" onClick={() => inputRef.current?.click()}>
          Load Script
        </button>
        <span className="scriptMeta">{script ? `${script.title} (${script.wordCount} words)` : "No script loaded"}</span>
      </div>
      {loadError ? <p className="loadError">{loadError}</p> : null}
    </main>
  );
}
