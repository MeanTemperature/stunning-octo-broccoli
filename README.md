# Radix Sort Visualizer

Interactive single-page app that contrasts least-significant-digit (LSD) and most-significant-digit (MSD) radix sort strategies on the same dataset. Generate sample numbers, step through both algorithms, and compare their work at each pass.

## Getting Started

1. Clone or pull this repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. Use the control panel to pick:
   - Array length (6-30)
   - Maximum digit count (1-6)
   - Random seed for reproducible runs
4. Click **Generate data**, then **Run demo**.
5. Step through manually (**Step >**) or hit **Play** to animate.

Everything runs locally; no build tools or servers required.

## What to Look For

- **Passes vs recursive calls:** LSD iterates once per digit place, while MSD recurses through buckets, often revisiting digits.
- **Bucket writes:** Both algorithms touch every element, but MSD performs extra work as it splits and merges buckets at each depth.
- **Elapsed time:** Iterative LSD tends to finish faster thanks to its linear memory access pattern and lack of recursion overhead.

The right-hand explainer panel summarizes the theoretical reasons LSD implementations usually win for fixed-length numeric inputs.
