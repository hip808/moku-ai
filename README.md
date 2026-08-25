# MOKU AI Web Emulator

Early product/UX validation prototype for **MOKU AI**, an AI-programmable Eurorack module.

## What this prototype demonstrates

- Virtual MOKU AI front panel
- 4 programmable controls
- Simulated CV inputs/outputs and gate signals
- Browser audio oscillator for proof-of-concept DSP interaction
- Example apps: Generative Sequencer, Dual LFO, Quantizer, Macro Oscillator, Random Utility, Stereo Delay
- Mock MOKU App Store
- Mock AI Studio that converts a natural-language prompt into a safe app definition
- Conceptual MOKU SDK / hardware abstraction layer
- Local patch saving with browser localStorage

## Run

No build process is required. Open `index.html` in a modern browser.

For best browser-audio behavior, serve the folder locally with `python3 -m http.server 8000` and open `http://localhost:8000`.

## Important

This is a **UX/product emulator**, not an electrical or cycle-accurate emulator. CV/gate/audio behavior is simplified. Its purpose is to validate front-panel layout, app workflow, MOKU SDK abstractions, AI-created app UX and the App Store/platform concept.

## Proposed next phases

- Add drag-to-patch virtual cables
- Implement richer audio DSP using Web Audio / AudioWorklet
- Add a JSON-based MOKU app manifest
- Add safe sandboxed generated apps
- Make hardware layout match the final 12HP mechanical dimensions
- Add MIDI Web API support
- Add patch sharing/export
- Add real backend + LLM integration
- Mirror the same MOKU API in STM32/Daisy firmware

## Future repository structure

```text
moku-ai/
├─ web-emulator/
├─ firmware/
│  ├─ runtime/
│  ├─ hal/
│  └─ apps/
├─ sdk/
├─ hardware/
│  ├─ specs/
│  ├─ schematic/
│  └─ pcb/
├─ docs/
└─ README.md
```

## License

Not selected yet. MOKU AI is currently considering an **open-core** model rather than automatically licensing the entire product permissively.
