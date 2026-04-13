# viGu Video Editor

`viGu` is a browser-based video editor that works fully on the client side. The project lets you assemble short videos on a timeline, combine clips and images, preview the result in the browser, and export the final file without a backend render server.

Demo: https://artemlapys.github.io/SkoolHack/

## Main Idea

The editor is built around a simple principle: the user uploads media, edits it directly in the browser, and exports the result locally through `FFmpeg WebAssembly`.

This approach gives a few important benefits:

- no server-side rendering infrastructure
- no media upload to a remote backend for export
- quick iteration for small and medium projects
- a single-page workflow for editing and rendering

## Tech Stack

The project is written with:

- `HTML`
- `CSS`
- `JavaScript` without a heavy frontend framework

Key libraries:

- `@ffmpeg/ffmpeg` and `@ffmpeg/core-mt`
- `coi-serviceworker`
- `Bootstrap` for UI components

## Current Functionality

### Media and Timeline

- Add video and image files into the project
- Place media on timeline layers
- Move clips along the timeline
- Trim clips by time
- Duplicate clips
- Work with multiple layers
- Preview the current frame and timeline position in the browser

### Visual Editing

- Brightness adjustment
- Contrast adjustment
- Saturation adjustment
- Gamma adjustment
- Temperature adjustment
- Tint adjustment
- Image orientation normalization for JPEG files with EXIF rotation
- Automatic fit of media into the export frame with padding

### Export Settings

- Export directly in the browser
- Quality selection from `144p` to `4K`
- FPS selection
- HDR to SDR conversion
- Two HDR modes:
- `Fast HDR` for quicker renders
- `Slow HDR` for more accurate color conversion

### Export Pipeline

The export system now uses a multi-step pipeline:

1. Every source clip is first normalized into a prepared MP4 clip.
2. During preparation, video is scaled, padded, color-corrected, and converted into a unified export format.
3. Audio is normalized to a common sample rate.
4. Final assembly is selected automatically depending on the timeline structure.

Available final assembly modes:

- `Single clip fast path`
- Used when the timeline effectively contains one full-length prepared clip.
- `Concat assembly`
- Used when clips do not overlap in time.
- Gap clips with black frames are inserted automatically when there are empty spaces between clips.
- `Prepared FFmpeg overlay assembly`
- Used when clips truly overlap in time.
- Final composition is built through `FFmpeg filter_complex`, not through browser `canvas` recording.

### Export Reliability Improvements

The latest export fixes include:

- direct final MP4 assembly through FFmpeg for overlapping clips
- removal of the old browser `canvas -> MediaRecorder -> transcode to mp4` path from the main overlay workflow
- correct assembly mode selection based on real temporal overlap
- support for silent source clips during final assembly
- normalized audio handling before final mix
- timeout protection for long or stuck FFmpeg operations
- automatic FFmpeg reload after a timed-out operation
- correct layer order during overlay export

## How Export Works Now

In practice, export behaves like this:

- If clips go one after another with no overlap, the editor uses `concat`
- If clips overlap in time, the editor uses FFmpeg overlay composition
- If there is only one prepared clip covering the full project, that file is downloaded directly

This makes export faster and more stable for simple timelines, while still supporting layered compositions when they are actually needed.

## Running the Project

Because FFmpeg WebAssembly requires cross-origin isolation, the project should be opened through `localhost` or `https`, not просто как локальный `file://`.

Important requirement:

- `SharedArrayBuffer` and `crossOriginIsolated` must be available

If these are missing, FFmpeg export will not start.

## Project Limitations

Current limitations of the browser-first approach:

- export speed depends heavily on browser performance and available RAM
- heavy HDR media can render slowly
- very large layered projects are still expensive in WebAssembly
- export reliability depends on browser support for cross-origin isolation

## Possible Future Improvements

- server-side rendering for heavy projects
- richer layer transforms and positioning
- more advanced compositing and transitions
- explicit audio controls on the timeline
- support for additional output formats
- better recovery and diagnostics for failed renders

## Authors

- ArtemLapys
- TedCraft
- MeToDucT
- AIR_RU
