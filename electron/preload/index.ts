import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('simpleApi', {
  openFile: (filters: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('simple:open-file', filters),
  readBinary: (path: string) => ipcRenderer.invoke('simple:read-binary', path),
  saveFile: (opts: { defaultPath?: string; ext: string }) => ipcRenderer.invoke('simple:save-file', opts),
  writeBinary: (path: string, base64: string) => ipcRenderer.invoke('simple:write-binary', path, base64),
})
