/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    simpleApi: {
      openFile: (filters: { name: string; extensions: string[] }[]) => Promise<{ canceled: true } | { canceled: false; path: string }>
      readBinary: (path: string) => Promise<{ base64: string; name: string }>
      saveFile: (opts: { defaultPath?: string; ext: string }) => Promise<{ canceled: true } | { canceled: false; path: string }>
      writeBinary: (path: string, base64: string) => Promise<{ ok: true }>
    }
  }
}
