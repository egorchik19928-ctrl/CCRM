import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '../..')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function registerIpc(): void {
  ipcMain.handle('simple:open-file', async (_, filters: { name: string; extensions: string[] }[]) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const r = await dialog.showOpenDialog(win ?? undefined, {
      properties: ['openFile'],
      filters: filters.length ? filters : [{ name: 'Все', extensions: ['*'] }],
    })
    if (r.canceled || !r.filePaths[0]) return { canceled: true as const }
    return { canceled: false as const, path: r.filePaths[0] }
  })

  ipcMain.handle('simple:read-binary', async (_, filePath: string) => {
    const buf = await fs.readFile(filePath)
    return { base64: buf.toString('base64'), name: path.basename(filePath) }
  })

  ipcMain.handle('simple:save-file', async (_, opts: { defaultPath?: string; ext: string }) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const r = await dialog.showSaveDialog(win ?? undefined, {
      defaultPath: opts.defaultPath,
      filters: [{ name: opts.ext.toUpperCase(), extensions: [opts.ext] }],
    })
    if (r.canceled || !r.filePath) return { canceled: true as const }
    return { canceled: false as const, path: r.filePath }
  })

  ipcMain.handle('simple:write-binary', async (_, filePath: string, base64: string) => {
    await fs.writeFile(filePath, Buffer.from(base64, 'base64'))
    return { ok: true as const }
  })
}

registerIpc()

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow(): Promise<void> {
  win = new BrowserWindow({
    title: 'Резюме (просто)',
    width: 1100,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    webPreferences: { preload },
  })
  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    await win.loadFile(indexHtml)
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
