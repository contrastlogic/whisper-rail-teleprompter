export interface ScriptDocument {
  title: string;
  lines: string[];
  wordCount: number;
}

const WORD_PATTERN = /[A-Za-z0-9']+/g;

export function parseScriptFromText(source: string, title = "Untitled Script"): ScriptDocument {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const wordCount = lines.reduce((total, line) => {
    const matches = line.match(WORD_PATTERN);
    return total + (matches?.length ?? 0);
  }, 0);

  return {
    title,
    lines,
    wordCount,
  };
}

export async function readScriptFile(file: File): Promise<ScriptDocument> {
  const text = await file.text();
  const title = file.name.replace(/\.[^.]+$/, "");
  return parseScriptFromText(text, title || "Untitled Script");
}
