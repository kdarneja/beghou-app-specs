import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` is '/' in dev so localhost works at the root, and the repo subpath
// in build so GitHub Pages can resolve assets at /beghou-app-specs/*.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/beghou-app-specs/' : '/',
  plugins: [react()],
  server: { port: 5173, open: true },
  // @progress/kendo-drawing and @progress/kendo-charts ship two ESM builds:
  // - dist/es/    — ES5-style prototype-chain shim. When ShapeBuilder does
  //                 `Class.apply(this, arguments)` against the ES6 base class
  //                 `class Class {}`, V8 throws "Class constructor Class cannot
  //                 be invoked without 'new'." This is what `module` resolves to.
  // - dist/es2015/ — proper `class X extends Class {}` ES6 build. Works.
  // Route the bare specifier to es2015 so the ES5 shim is never executed.
  resolve: {
    alias: [
      {
        find: /^@progress\/kendo-drawing$/,
        replacement: '@progress/kendo-drawing/dist/es2015/main.js',
      },
      {
        find: /^@progress\/kendo-charts$/,
        replacement: '@progress/kendo-charts/dist/es2015/main.js',
      },
    ],
  },
  build: { target: 'es2020' },
}));
