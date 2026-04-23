/* ================================================================
   Monaco Editor Worker Loader
   
   Configures Web Workers for Monaco's language services:
   - TypeScript/JavaScript worker
   - CSS/SCSS/LESS worker
   - JSON worker
   - HTML worker
   - Editor (default) worker
   
   This must be imported before the first Monaco instance is created.
   ================================================================ */

import * as monaco from 'monaco-editor'

(self as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    // Default editor worker
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
      { type: 'module' }
    )
  },
}

/* ================================================================
   TypeScript Compiler Options
   
   Monaco 0.55+ deprecated monaco.languages.typescript in favour of
   top-level exports from the TS contribution module. The .d.ts file
   for the contribution is empty, so we access the runtime API via
   dynamic import with an `any` cast.
   ================================================================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function configureTypeScript() {
  try {
    // The contribution module registers the TS/JS language providers
    // and exposes typescriptDefaults, ScriptTarget, etc. at runtime.
    const ts = await (Function('return import("monaco-editor/esm/vs/language/typescript/monaco.contribution")')() as Promise<Record<string, unknown>>)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typescriptDefaults = ts.typescriptDefaults as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const javascriptDefaults = ts.javascriptDefaults as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ScriptTarget = ts.ScriptTarget as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ModuleKind = ts.ModuleKind as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ModuleResolutionKind = ts.ModuleResolutionKind as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JsxEmit = ts.JsxEmit as any

    if (!typescriptDefaults) return

    typescriptDefaults.setCompilerOptions({
      target: ScriptTarget.ES2020,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: JsxEmit.ReactJSX,
      esModuleInterop: true,
      strict: true,
      noEmit: true,
      lib: ['es2020', 'dom', 'dom.iterable'],
    })

    javascriptDefaults.setCompilerOptions({
      target: ScriptTarget.ES2020,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: JsxEmit.ReactJSX,
      esModuleInterop: true,
      noEmit: true,
    })

    // Add basic React type stubs for IntelliSense
    const reactTypes = `
declare module 'react' {
  export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useContext<T>(context: any): T;
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void];
  export type ReactNode = string | number | boolean | null | undefined | JSX.Element;
  export type FC<P = {}> = (props: P) => ReactNode;
  export type ComponentType<P = {}> = FC<P>;
  export interface CSSProperties { [key: string]: string | number | undefined; }
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
`
    typescriptDefaults.addExtraLib(reactTypes, 'file:///node_modules/@types/react/index.d.ts')
    javascriptDefaults.addExtraLib(reactTypes, 'file:///node_modules/@types/react/index.d.ts')

    typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
  } catch {
    // TS language contribution not available — editor works without IntelliSense
  }
}

configureTypeScript()

export { monaco }
