# UPBus Mobile Agent Guide

These instructions extend the root `AGENTS.md` for work inside `upbus-mobile/`.

## Runtime

- Expo SDK 56.0.x
- React Native 0.85.x and React 19.2.x
- Expo Router with routes in `app/`
- TypeScript 6 with Jest/ts-jest tests in `__tests__/`

Expo has changed substantially across SDK releases. Before writing code against
an Expo or React Native API, use the exact SDK 56 documentation at
`https://docs.expo.dev/versions/v56.0.0/` and confirm the installed package
versions in `package.json`.

## Project Layout

- `app/_layout.tsx`: root navigation/layout and application providers.
- `app/(tabs)/`: passenger tabs for map, routes, complaints, and sustainability.
- `components/`: reusable mobile UI.
- `lib/api.ts`: backend API access using `EXPO_PUBLIC_API_URL`.
- `lib/busMotionEngine.ts`, `lib/useAnimatedBuses.ts`: live bus animation.
- `lib/kmlParser.ts`, `lib/useKmlStops.ts`, `lib/useRouteMap.ts`: route geometry
  and stop loading.
- `lib/notifications.ts`: device notification behavior.
- `lib/preloadGate.ts`, `lib/slowLoadContext.tsx`: startup/loading state.
- `assets/kml/`: mobile-bundled route data.

## Commands

```bash
npm start
npm run lint
npm test
npm run android
npm run ios
npm run web
```

Run focused tests with `npm test -- --runInBand <test-file>` when iterating, then
run the complete suite before reporting completion.

## Constraints

- Never expose values from `.env`, `credentials.json`, `credentials/`, or signing
  certificate/key files.
- Do not edit generated `.expo/`, `dist/`, `build-output/`, or native build output
  unless the task explicitly targets generated artifacts.
- Native behavior involving maps, location, notifications, secure storage, or
  glass effects requires device/platform verification; a Jest pass alone is not
  sufficient.
- A similarly named implementation may exist in `frontend/lib/`. Do not silently
  assume it is shared code or update it outside the requested scope.
