import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ScriptDocument } from "../lib/scriptLoader";
import { ScrollController } from "../lib/scrollController";
import { SpeechPaceEstimator } from "../lib/speechPace";

interface TeleprompterWindowProps {
  script: ScriptDocument | null;
}

const controller = new ScrollController({ basePxPerSecond: 44 });
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function TeleprompterWindow({ script }: TeleprompterWindowProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const maxOffsetRef = useRef(0);
  const estimatorRef = useRef<SpeechPaceEstimator | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  const lines = script?.lines ?? [];
  const empty = lines.length === 0;

  const statusText = useMemo(() => {
    if (empty) {
      return "Load a .txt script to begin";
    }
    if (isRunning) {
      return "Live pace sync on";
    }
    return "Paused";
  }, [empty, isRunning]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const viewportHeight = viewportRef.current?.clientHeight ?? 0;
      const contentHeight = contentRef.current?.scrollHeight ?? 0;
      maxOffsetRef.current = Math.max(0, contentHeight - viewportHeight);
      setOffsetPx((current) => Math.min(current, maxOffsetRef.current));
    });

    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => observer.disconnect();
  }, [script]);

  useEffect(() => {
    controller.reset();
    setOffsetPx(0);
    setIsRunning(false);
    setMicError(null);
    estimatorRef.current?.stop();
    estimatorRef.current = null;
  }, [script?.title]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        void toggleRun();
        return;
      }

      if (event.key === "]") {
        controller.setManualOffset(0.08);
      } else if (event.key === "[") {
        controller.setManualOffset(-0.08);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveOffset(34);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveOffset(-34);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        moveOffset(180);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        moveOffset(-180);
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetScriptPosition();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [empty, isRunning]);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (isRunning) {
        setOffsetPx((previous) => {
          const next = Math.min(previous + controller.tick(dt), maxOffsetRef.current);
          if (next >= maxOffsetRef.current && maxOffsetRef.current > 0) {
            controller.setRunning(false);
            setIsRunning(false);
          }
          return next;
        });
      }

      frameRef.current = window.requestAnimationFrame(loop);
    };

    frameRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    controller.setRunning(isRunning);
  }, [isRunning]);

  useEffect(() => {
    return () => {
      estimatorRef.current?.stop();
      estimatorRef.current = null;
    };
  }, []);

  async function toggleRun(): Promise<void> {
    if (empty) {
      return;
    }

    if (isRunning) {
      controller.setRunning(false);
      setIsRunning(false);
      estimatorRef.current?.stop();
      estimatorRef.current = null;
      return;
    }

    setMicError(null);
    try {
      const estimator = new SpeechPaceEstimator({
        onSample: (sample) => {
          controller.setSpeechMultiplier(sample.paceMultiplier, sample.isSpeaking);
          setMicLevel(sample.level);
        },
      });
      await estimator.start();
      estimatorRef.current = estimator;
      controller.setRunning(true);
      setIsRunning(true);
    } catch {
      setMicError("Microphone access is required for auto pace sync.");
    }
  }

  function moveOffset(delta: number): void {
    setOffsetPx((previous) => clamp(previous + delta, 0, maxOffsetRef.current));
  }

  function resetScriptPosition(): void {
    setOffsetPx(0);
  }

  function handleViewportWheel(event: WheelEvent<HTMLElement>): void {
    if (Math.abs(event.deltaY) < 0.5) {
      return;
    }
    event.preventDefault();
    moveOffset(event.deltaY);
  }

  async function handleWindowBarPointerDown(event: PointerEvent<HTMLElement>): Promise<void> {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore drag failures outside desktop runtime.
    }
  }

  return (
    <section className="window">
      <div className="readingZone" onWheel={handleViewportWheel}>
        <div className="viewport" ref={viewportRef}>
          <div className="script" ref={contentRef} style={{ transform: `translateY(-${offsetPx}px)` }}>
            {empty ? (
              <p className="placeholder">
                Drop in a script and press Start. The scroll speed follows your live speaking rhythm.
              </p>
            ) : (
              lines.map((line, index) => (
                <p className="line" key={`${index}-${line.slice(0, 16)}`}>
                  {line}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <header
        className="windowBar"
        data-tauri-drag-region
        onPointerDown={(event) => {
          void handleWindowBarPointerDown(event);
        }}
      >
        <span className="statusDot" data-running={isRunning} />
        <span className="statusText">{statusText}</span>
        <button type="button" className="ghostButton" onClick={resetScriptPosition} disabled={empty}>
          Reset
        </button>
        <button type="button" className="startButton" onClick={() => void toggleRun()} disabled={empty}>
          {isRunning ? "Pause" : "Start"}
        </button>
      </header>

      <footer className="windowFooter">
        <span className="meter">
          <span className="meterFill" style={{ width: `${Math.round(micLevel * 100)}%` }} />
        </span>
        <span className="hint">Wheel or Up/Down moves text. R resets.</span>
      </footer>

      {micError ? <p className="micError">{micError}</p> : null}
    </section>
  );
}
