# WhisperRail — Operational instructions

## Purpose

WhisperRail is a desktop teleprompter window that scrolls plain-text scripts. With **Start**, scroll speed follows your live speaking rhythm using the microphone. You can also move the text manually with the mouse wheel or keyboard while **Start** is on or off.

## Getting the application

### End users

Install and launch **WhisperRail** from the application bundle your team provides (for example the output of `npm run tauri build` under this project). This is a **desktop app**, not a website—open it from the Start menu, desktop shortcut, or install folder like any other program.

### Developers / internal use

From the project root:

1. Install dependencies: `npm install`
2. **Development:** `npm run tauri dev` (starts the Vite frontend and the Tauri shell). You need a supported **Node.js** version and the **Rust** toolchain required by [Tauri](https://tauri.app/).
3. **Release build:** `npm run tauri build` produces installable artifacts according to `src-tauri/tauri.conf.json`.

## Main window

| Area | What it does |
|------|----------------|
| **Top strip** | **Load Script** opens a file picker. Next to it, the script title and word count appear, or **No script loaded** when nothing is open. |
| **Reading area** | Your script scrolls here. When no script is loaded, a short placeholder explains how to begin. |
| **Header bar** (status dot, status line, **Reset**, **Start** / **Pause**) | Shows state and primary controls. Drag the bar (not the buttons) to move the window. |
| **Footer** | A level meter reflects microphone input when the mic is active. Hint text: *Wheel or Up/Down moves text. R resets.* |

Default window size is about 760×360 pixels; you can resize. The window stays **always on top** of other windows and has **no standard title bar** (frameless)—use the header bar to drag.

## Typical workflow

1. Click **Load Script** and choose a `.txt` file.
2. Click **Start** (or press **Space**). Allow **microphone** access if the operating system asks.
3. Read from the scrolling text. Use **Pause** or **Space** to stop auto-scroll; the microphone is released when you pause.
4. When the script scrolls to the end, playback stops on its own.
5. Use **Reset** or **R** to jump back to the top for another run.

## Script file format

- Use **plain text** files; the picker is set for `.txt` and `text/plain`.
- Save scripts as **UTF-8** text for predictable results.
- Each **non-empty line** becomes one on-screen line. **Blank lines are removed** when the file is loaded—paragraphs should be separate non-empty lines if you want them as separate lines.
- The title shown is the **file name without extension**; the strip also shows a **word count** (words are counted from alphanumeric tokens per line).

If the file has no readable lines after processing, you may see: **The selected file is empty.** If the file cannot be read: **Unable to read this file.**

## Status messages

| Message | Meaning |
|---------|---------|
| **Load a .txt script to begin** | No script loaded, or script has no lines to show. |
| **Paused** | A script is loaded; auto-scroll is off. |
| **Live pace sync on** | Auto-scroll is running with microphone pace sync. |

Placeholder copy when empty: *Drop in a script and press Start. The scroll speed follows your live speaking rhythm.*

## Keyboard and mouse reference

| Action | Input |
|--------|--------|
| Start / Pause | **Space**, or **Start** / **Pause** |
| Move text (manual) | **Mouse wheel** over the reading area; **↑** / **↓** (34 px); **Page Up** / **Page Down** (180 px) |
| Fine-tune auto pace | **[** slower, **]** faster (adjusts manual pace offset while syncing) |
| Jump to top of script | **R** or **Reset** |

**Space** does nothing for Start/Pause when there is no script loaded (or the script is effectively empty).

## Microphone

- **Start** requires **microphone access**. The app requests audio with echo cancellation, noise suppression, and automatic gain control where the browser stack supports them.
- If access is denied or the device cannot be opened, you may see: **Microphone access is required for auto pace sync.**

**Troubleshooting**

- In **Windows**, check **Settings → Privacy & security → Microphone** and allow access for desktop apps if needed; confirm the correct input device in **Sound** settings.
- Close other apps that might hold the mic exclusively.
- Test the mic in system settings before a session.

## Window behavior

- **Drag:** Press and drag the **header bar** (avoid clicking **Reset** and **Start**/**Pause**—those start their own actions). The bar is also marked for the desktop runtime’s drag region.
- **Always on top:** The window stays above normal windows so it works as an overlay.
- **Resize:** Use the window edges or corners as usual for your OS.

## Limitations and expectations

- Pace sync is driven by **live audio level and speech activity**, not by speech-to-text or a fixed words-per-minute setting. Loud rooms, the wrong mic, or heavy background noise can make scrolling feel less smooth.
- For roughly the first **two seconds** after **Start**, scroll speed **ramps up** so the first words do not jerk the text (see `src/lib/scrollController.ts`).
- This is not a substitute for rehearsal—use manual scroll (**wheel** / **arrow keys**) if you need full control.
