# TonPayButton Showcase

Visual test page for the TonPayButton component showcasing all variants, presets, and styling options.

## Run the showcase

From the root of the monorepo:

```bash
bun test:button
```

Or from the `packages/ui-react` directory:

```bash
bun run test:button
```

This will:
1. Install dependencies in the test folder
2. Start a Vite dev server on `http://localhost:3000`
3. Automatically open the showcase in your browser

## What's included

The showcase displays:

### Default Option
- 6 combinations of long/short variants with rounded (8px), square (0px), and pill (99px) border radius

### Preset 1: Gradient
- 6 combinations using the gradient preset

### Preset 2: Black Theme
- Custom black theme examples with different variants and border radii

### Custom Styles
- Purple, green, red, and amber color themes
- Custom text examples
- Large and compact size examples

### States
- Loading state with spinner
- Disabled state
- Button without dropdown menu
- Loading state with gradient preset

## Tech Stack

- React 18
- Vite (for fast HMR)
- TypeScript
- TonConnect UI React

## File Structure

```
test/
├── button-showcase.html    # HTML entry point
├── button-showcase.tsx     # React showcase component
├── package.json           # Test dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```














