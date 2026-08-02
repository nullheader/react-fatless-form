# react-fatless-form 🥬

![License](https://img.shields.io/github/license/aderahenry/react-fatless-form) [![CI](https://github.com/oneadera/react-fatless-form/actions/workflows/ci.yml/badge.svg)](https://github.com/oneadera/react-fatless-form/actions/workflows/ci.yml) ![core](https://img.shields.io/npm/v/react-fatless-form?label=core) ![web](https://img.shields.io/npm/v/react-fatless-form-web?label=web) ![native](https://img.shields.io/npm/v/react-fatless-form-native?label=native)

_A headless form library for React and React Native. Lean, typed up the yin-yang, and built to stay out of your way._

```text
packages/
  core/    react-fatless-form         - headless form state, zero DOM/RN knowledge (v5)
  web/     react-fatless-form-web     - DOM bindings (<input>, <select>, <form>)
  native/  react-fatless-form-native  - React Native bindings (TextInput, Switch)
examples/
  web/     example-web                - signup form using react-fatless-form-web + MUI
  native/  example-native             - signup form using react-fatless-form-native + React Native Paper
```

Start with whichever package README matches what you're building:
[core](packages/core/README.md) · [web](packages/web/README.md) · [native](packages/native/README.md)

---

## Why fatless?

The name has always meant "no baggage." No bloated abstractions, no laundry list of dependencies, no over-engineered features you'll never use. It's form state management that's been on a diet - still powerful, but won't weigh your project down.

Earlier versions took this pretty far on the _outside_ while carrying real weight on the _inside_: a built-in `Input` component that rendered its own datepicker, time picker, drag-and-drop file picker, and password-strength meter, plus a `FeedbackManager` toast system wired straight into `handleSubmit`.

v5 takes "fatless" more literally. `react-fatless-form` has exactly one dependency (`react`). It doesn't render a single pixel, doesn't ship a datepicker, and doesn't know what a toast notification is. It manages state, validation, and types - your design system handles the rest.

---

## Coming from v4?

v5 is a ground-up rewrite. The key API names (`useForm`, `useFormContext`, `FormProvider`, `handleSubmit`, `yupResolver`) all survive - your mental model carries over.

**What changed:**

- The all-in-one `Input` component is gone (and with it the built-in datepicker, time picker, file dropzone, password-strength meter). v5 is fully headless - bring your own UI library.
- `FeedbackManager`/`FeedbackContainer` are gone. Show feedback in your own `onSuccess`/`onError` callbacks.
- `validateSchema` is gone (it was deprecated in v4).
- `handleSubmit`'s positional `onSuccess` and `feedbackConfig` arguments are now a single `config` object: `{ onSuccess, onError, resetOnSuccess }`.
- Field paths now support deeply nested dot-notation (`'address.street'`) with full TypeScript inference - not just top-level keys.
- New typed path filters (`StringFieldPath`, `BooleanFieldPath`, `NumberFieldPath`, `StringArrayFieldPath`) so typed input components can't be wired to the wrong field type at compile time.
- `form.setFocus('fieldName')` for imperative, typed focus control.
- React Native support via the new `react-fatless-form-native` package.

If you relied on the batteries-included `Input` experience, pin to v4 for now. A separate opinionated component package built _on top of_ `react-fatless-form-web` would be the right home for that - not the headless core.

---

## Installing only what you need

A web app installs `react-fatless-form-web` and never sees `react-native` anywhere in its dependency tree - not even as an unmet peer warning. A native app installs `react-fatless-form-native` and never pulls in any DOM types. `react-fatless-form` comes along automatically as a transitive dependency of either.

```sh
# For web apps
npm install react-fatless-form-web

# For React Native / Expo apps
npm install react-fatless-form-native

# Core only (for custom platform bindings)
npm install react-fatless-form
```

**Why three packages, not one package with `/web` and `/native` subpath exports?**
`peerDependencies` are declared once per `package.json`, with no way to scope them to a single subpath. A single-package version would have to declare `react-native` as a peer of the entire package to support a `/native` export - and a web-only install would then see a peer warning it can never satisfy. Separate packages mean peer dependencies are exactly as scoped as the packages themselves.

---

## Why split this way

`react-fatless-form` (core) owns values, validation, errors, touched state, and dirty state, and knows nothing about `HTMLInputElement` or React Native's `TextInput`. `web` and `native` each add a thin layer that unwraps their platform's event shape (`event.target.value` vs. a plain string from `onChangeText`) into what core expects. Neither platform package imports the other, and core never imports either.

The payoff: validation logic, the field-path type system, and the submission lifecycle are written and tested exactly once. A new platform binding only has to write the event-unwrapping layer.

---

### A note on the first run

The `.yarn/cache` is committed (offline-friendly installs) but the first `yarn install` after cloning is still required to materialize `node_modules` from that cache. After that, subsequent installs only need to run when adding or updating packages.

The web example resolves `react-fatless-form` and `react-fatless-form-web` straight to their TypeScript source via `vite.config.ts` aliases, so `yarn workspace example-web dev` works without building first and edits to library source hot-reload immediately. The native example runs `build:deps` as a pre-hook, building core and native before Expo starts.

---

## Testing

Each package owns its own Jest config (`jest.config.cjs`), Babel config (`babel.config.cjs`), and `__tests__/` directory - mirroring how `build`/`typecheck`/`lint` are already per-package scripts orchestrated from the root via `yarn workspaces foreach`, rather than one shared root config.

```bash
yarn test              # every package's suite, via workspaces foreach
yarn test:coverage     # same, with coverage

yarn workspace react-fatless-form test              # just core
yarn workspace react-fatless-form-web test:watch     # just web, watch mode
```

---

## Examples

Both examples are the same signup form - first/last name, email, password, agree-to-terms - so the web and native API surfaces are easy to compare side by side:

- **[web](examples/web)** - [MUI](https://mui.com)
- **[native](examples/native)** - [React Native Paper](https://callstack.github.io/react-native-paper/) via Expo

---

## Development

Root-level scripts fan out across `packages/*` via `yarn workspaces foreach`
(examples are excluded from most of these - they're apps, not published
packages):

| Script | What it does |
| --- | --- |
| `yarn typecheck` | `tsc --noEmit` in each package |
| `yarn typecheck:examples` | same, for `examples/*` - catches the packages' API drifting out from under the example apps |
| `yarn lint` | `eslint src` in each package |
| `yarn test` / `yarn test:coverage` | Jest in each package |
| `yarn build` | Rollup in each package - emits `dist/{index.js,index.cjs,index.d.ts}` |
| `yarn docs` | [TypeDoc](https://typedoc.org) in each package - emits a browsable API reference into that package's `docs/`, generated straight from the JSDoc on its exports |

CI (`.github/workflows/ci.yml`) runs `typecheck`, `typecheck:examples`, `lint`, `test`, and `build` on Node 22.x and 24.x for every push and pull request to `main`.

---

## License

MIT
