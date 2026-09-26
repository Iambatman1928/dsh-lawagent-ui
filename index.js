/**
 * 法学学习实训工作台 · Host 半
 *
 * 职责只有两件事：
 *   1. 只读地读「明律」（agent preset `lawagent`）的学习档案 lawdata/，
 *      并把三栏工作台需要的全部数据一次性算好（overview / caseDetail / cards / wrong …）。
 *   2. 需要时把一条指令**真的**送进明律的会话（sessionController.prompt），
 *      于是 PRD 里那些「一键联动」不是文案，而是点一下就发生的事。
 *
 * 客户端半（client.js）通过 fetch('/lawui/api/<method>') 调用，信封与 dsh-skill-manager 一致：
 *   { ok: true, value } | { ok: false, error: { code, message } }
 *
 * 数据契约：lawdata/ 下的 JSON 由 preset 的 plugin/store.js 拥有（唯一写入者）。
 * 本文件是**协同读取方**：容忍字段缺失、绝不猜测结构，写入只做两件事
 * （settings.json 的合并写、flashcards/wrongbook 的复习排程更新），且都沿用同一套字段名。
 * 两边任何一方改结构，另一方必须同步。
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

const name = 'lawagent-ui'
const inject = ['webServer']
const MAX_BODY = 2 * 1024 * 1024

/** 与 preset `lawagent` 行 dataRoot 保持一致；行配置可覆盖 */
const DEFAULT_DATA_ROOT = path.join(os.homedir(), 'lawdata')

/** 案件卷宗里可挂载的分析产物分区（与 store.js 的 SECTIONS 一致） */
const SECTIONS = [
  'facts',
  'elements',
  'timeline',
  'syllogisms',
  'arguments',
  'fallacies',
  'drills',
  'reviews',
  'documents',
  'papers',
  'moot',
]

/** 间隔复习的间隔（天），与 store.js 的 BOX_INTERVALS 一致 */
const BOX_INTERVALS = [0, 1, 2, 4, 7, 15, 30]

/**
 * 各模块可自选的「资料来源文件夹」—— 与预设插件 `plugin/notes.js` 共用同一份
 * `lawdata/modules.json`。**两边字段名必须一致**。
 * 每个模块可以挂多个文件夹；文件夹可以屏蔽（enabled=false）或删除。
 */
const MODULES = [
  { key: 'engine', label: '法律逻辑与论证辅助' },
  { key: 'norms', label: '法条库' },
  { key: 'cases', label: '案例库' },
  { key: 'drills', label: '刷题训练' },
  { key: 'docs', label: '法律文书练习' },
  { key: 'papers', label: '论文辅助' },
  { key: 'moot', label: '庭审模拟' },
  { key: 'cards', label: '知识点背诵' },
  { key: 'notes', label: '我的笔记/错题本' },
]

/** 能直接读文本的扩展名；其余只登记元数据（转换交给明律的 shell / OCR 能力） */
const TEXT_EXT = new Set(['.md', '.markdown', '.txt', '.text', '.json', '.csv', '.yaml', '.yml', '.html', '.htm'])
const LIST_EXT = new Set([...TEXT_EXT, '.pdf', '.doc', '.docx', '.rtf', '.png', '.jpg', '.jpeg', '.webp'])
const SKIP_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules', '.cairn', '.graphflow-cache', '.dsh'])
const MAX_SCAN_FILES = 1500
const MAX_READ_BYTES = 200 * 1024

const DISCLAIMER =
  '本产品为法律学习实训工具，所有内容仅用于学生学习练习，不构成任何正式法律意见，不可用于真实诉讼、实务办案。'

/**
 * 模块资料来源（lawdata/modules.json）的读写。
 *
 * 结构：
 * {
 *   version: 1,
 *   modules: {
 *     <key>: { label, dirs: [{ path, enabled, addedAt }], writePath }
 *   }
 * }
 * 读取一律容忍缺字段；写入用同一个 normalizer，保证 UI 与明律写出来的东西一样。
 */
function createSources(dataRoot) {
  const file = path.join(dataRoot, 'modules.json')

  const read = () => {
    const raw = readJson(file, {})
    const stored = raw && typeof raw.modules === 'object' && raw.modules !== null ? raw.modules : {}
    const modules = {}
    for (const spec of MODULES) {
      const entry = stored[spec.key] && typeof stored[spec.key] === 'object' ? stored[spec.key] : {}
      const dirs = Array.isArray(entry.dirs) ? entry.dirs : []
      modules[spec.key] = {
        key: spec.key,
        label: spec.label,
        dirs: dirs
          .filter((d) => d && typeof d.path === 'string' && d.path.trim() !== '')
          .map((d) => ({
            path: existingDir(d.path) ?? d.path,
            enabled: d.enabled !== false,
            addedAt: d.addedAt ?? null,
            missing: existingDir(d.path) === null,
          })),
        writePath: typeof entry.writePath === 'string' && entry.writePath.trim() !== '' ? entry.writePath : null,
      }
    }
    return { version: 1, modules }
  }

  const write = (next) => {
    const out = { version: 1, modules: {} }
    for (const spec of MODULES) {
      const entry = next.modules[spec.key] ?? { dirs: [], writePath: null }
      out.modules[spec.key] = {
        label: spec.label,
        dirs: entry.dirs.map((d) => ({ path: d.path, enabled: d.enabled !== false, addedAt: d.addedAt ?? null })),
        writePath: entry.writePath ?? null,
      }
    }
    writeJsonAtomic(file, out)
    return read()
  }

  /** 目录存在性（不做 realpath，避免网络盘/大小写带来的意外） */
  function existingDir(p) {
    try {
      const stat = fs.statSync(p)
      return stat.isDirectory() ? p : null
    } catch {
      return null
    }
  }

  const requireModule = (key) => {
    const spec = MODULES.find((m) => m.key === key)
    if (!spec) throw new Error(`未知模块：${key}（可用：${MODULES.map((m) => m.key).join(' / ')}）`)
    return spec
  }

  const add = (key, dirPath) => {
    requireModule(key)
    const target = String(dirPath ?? '').trim()
    if (!target) throw new Error('缺少文件夹路径')
    if (!existingDir(target)) throw new Error(`这个路径不是可访问的文件夹：${target}`)
    const state = read()
    const dirs = state.modules[key].dirs
    if (dirs.some((d) => samePath(d.path, target))) throw new Error('该文件夹已经在这个模块里了')
    dirs.push({ path: target, enabled: true, addedAt: new Date().toISOString() })
    return write(state)
  }

  const remove = (key, dirPath) => {
    requireModule(key)
    const state = read()
    const before = state.modules[key].dirs.length
    state.modules[key].dirs = state.modules[key].dirs.filter((d) => !samePath(d.path, dirPath))
    if (state.modules[key].dirs.length === before) throw new Error(`这个模块里没有文件夹：${dirPath}`)
    if (state.modules[key].writePath && samePath(state.modules[key].writePath, dirPath)) {
      state.modules[key].writePath = null
    }
    return write(state)
  }

  const toggle = (key, dirPath, enabled) => {
    requireModule(key)
    const state = read()
    const dir = state.modules[key].dirs.find((d) => samePath(d.path, dirPath))
    if (!dir) throw new Error(`这个模块里没有文件夹：${dirPath}`)
    dir.enabled = enabled === undefined ? !dir.enabled : enabled === true
    return write(state)
  }

  const setWritePath = (key, dirPath) => {
    requireModule(key)
    const state = read()
    if (dirPath === null || dirPath === '') {
      state.modules[key].writePath = null
      return write(state)
    }
    const target = String(dirPath).trim()
    if (!existingDir(target)) throw new Error(`这个路径不是可访问的文件夹：${target}`)
    if (!state.modules[key].dirs.some((d) => samePath(d.path, target))) {
      state.modules[key].dirs.push({ path: target, enabled: true, addedAt: new Date().toISOString() })
    }
    state.modules[key].writePath = target
    return write(state)
  }

  function samePath(a, b) {
    const norm = (p) => String(p ?? '').replace(/[\\/]+$/, '').replace(/\//g, '\\').toLowerCase()
    return norm(a) === norm(b)
  }

  /** 扫一个模块所有启用文件夹里的资料文件（深度 ≤ 3，跳过大目录） */
  const scan = (key) => {
    const state = read()
    const spec = requireModule(key)
    const module = state.modules[key]
    const dirs = []
    let total = 0
    let truncated = false
    for (const dir of module.dirs) {
      const entry = { path: dir.path, enabled: dir.enabled, missing: dir.missing, files: [], error: null }
      if (!dir.enabled) {
        dirs.push(entry)
        continue
      }
      try {
        const walk = (current, depth) => {
          if (truncated) return
          let items = []
          try {
            items = fs.readdirSync(current, { withFileTypes: true })
          } catch (error) {
            throw new Error(`读取失败：${error?.message ?? error}`)
          }
          for (const item of items) {
            if (truncated) return
            if (item.name.startsWith('.') && item.isDirectory()) continue
            if (item.isDirectory() && SKIP_DIRS.has(item.name)) continue
            const full = path.join(current, item.name)
            if (item.isDirectory()) {
              if (depth < 3) walk(full, depth + 1)
              continue
            }
            const ext = path.extname(item.name).toLowerCase()
            if (!LIST_EXT.has(ext)) continue
            if (total >= MAX_SCAN_FILES) {
              truncated = true
              return
            }
            let stat = null
            try {
              stat = fs.statSync(full)
            } catch {
              continue
            }
            entry.files.push({
              path: full,
              name: item.name,
              rel: path.relative(dir.path, full).replace(/\\/g, '/'),
              ext,
              bytes: stat.size,
              mtime: stat.mtimeMs,
              readable: TEXT_EXT.has(ext),
            })
            total += 1
          }
        }
        walk(dir.path, 0)
      } catch (error) {
        entry.error = String(error?.message ?? error)
      }
      entry.files.sort((a, b) => b.mtime - a.mtime)
      dirs.push(entry)
    }
    return { module: spec.key, label: spec.label, dirs, total, truncated, writePath: module.writePath }
  }

  /** 读一个资料文件的文本内容（只读文本类；其余返回提示） */
  const readSourceFile = (filePath) => {
    const target = String(filePath ?? '').trim()
    if (!target) throw new Error('缺少文件路径')
    let stat = null
    try {
      stat = fs.statSync(target)
    } catch {
      throw new Error(`文件不存在或不可读：${target}`)
    }
    if (!stat.isFile()) throw new Error('这不是一个文件')
    const ext = path.extname(target).toLowerCase()
    const base = { path: target, name: path.basename(target), ext, bytes: stat.size, mtime: stat.mtimeMs }
    if (!TEXT_EXT.has(ext)) {
      return {
        ...base,
        readable: false,
        hint: ext === '.pdf' ? 'PDF：让明律用 OCR / 转换技能处理，或你自己粘正文进来' : '这类文件工作台不直接渲染，交给明律的 shell / OCR 技能处理',
      }
    }
    const raw = fs.readFileSync(target)
    const slice = raw.length > MAX_READ_BYTES ? raw.subarray(0, MAX_READ_BYTES) : raw
    return { ...base, readable: true, content: slice.toString('utf8'), truncated: raw.length > MAX_READ_BYTES }
  }

  return { file, read, add, remove, toggle, setWritePath, scan, readSourceFile }
}

// ── 笔记（Obsidian 双链笔记）─────────────────────────────────────────────────

/** 极简 frontmatter 解析：只取本工作台要用的几个键，不引入 YAML 依赖 */
function parseFrontmatter(text) {
  const out = { data: {}, body: String(text ?? '') }
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(out.body)
  if (!match) return out
  out.body = out.body.slice(match[0].length)
  const raw = match[1]
  let currentKey = null
  for (const line of raw.split(/\r?\n/)) {
    const listItem = /^\s*-\s+(.*)$/.exec(line)
    if (listItem && currentKey) {
      const value = stripQuotes(listItem[1].trim())
      if (Array.isArray(out.data[currentKey])) out.data[currentKey].push(value)
      else out.data[currentKey] = [value]
      continue
    }
    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (!pair) continue
    currentKey = pair[1]
    const value = pair[2].trim()
    if (value === '') {
      out.data[currentKey] = []
      continue
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      out.data[currentKey] = value
        .slice(1, -1)
        .split(',')
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean)
    } else {
      out.data[currentKey] = stripQuotes(value)
    }
  }
  return out
}

function stripQuotes(value) {
  return String(value ?? '').replace(/^["']|["']$/g, '')
}

/** 抽出正文里的 [[双链]] 目标（去掉 |别名 与 #标题 后缀） */
function extractLinks(text) {
  const targets = new Set()
  const re = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g
  let m
  while ((m = re.exec(String(text ?? ''))) !== null) {
    const target = m[1].trim()
    if (target) targets.add(target)
  }
  return [...targets]
}

/**
 * 列出笔记根目录里的 Obsidian 笔记（含 frontmatter 摘要与出链）。
 * 与预设的 `law_note` 工具共用一个目录约定：<root>/<kind>/<标题>.md。
 */
function createNotes(sources, dataRoot) {
  const fallbackRoot = path.join(dataRoot, 'notes')

  const readRoots = () => {
    const state = sources.read()
    const notes = state.modules.notes
    const roots = []
    if (notes.writePath) roots.push(notes.writePath)
    for (const dir of notes.dirs) {
      if (dir.enabled && !roots.includes(dir.path)) roots.push(dir.path)
    }
    if (roots.length === 0) roots.push(fallbackRoot)
    return { roots, writePath: notes.writePath ?? fallbackRoot, isFallback: roots.length === 1 && roots[0] === fallbackRoot }
  }

  const list = () => {
    const { roots, writePath, isFallback } = readRoots()
    const items = []
    let truncated = false
    for (const root of roots) {
      if (!fs.existsSync(root)) continue
      const walk = (current, depth) => {
        if (truncated || depth > 4) return
        let entries = []
        try {
          entries = fs.readdirSync(current, { withFileTypes: true })
        } catch {
          return
        }
        for (const entry of entries) {
          if (truncated) return
          if (entry.name.startsWith('.')) continue
          const full = path.join(current, entry.name)
          if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walk(full, depth + 1)
            continue
          }
          const ext = path.extname(entry.name).toLowerCase()
          if (ext !== '.md' && ext !== '.markdown') continue
          if (items.length >= 800) {
            truncated = true
            return
          }
          let stat = null
          let text = ''
          try {
            stat = fs.statSync(full)
            text = fs.readFileSync(full, 'utf8')
          } catch {
            continue
          }
          const parsed = parseFrontmatter(text)
          const title = path.basename(entry.name, ext)
          items.push({
            path: full,
            title,
            name: entry.name,
            rel: path.relative(root, full).replace(/\\/g, '/'),
            dir: root,
            bytes: stat.size,
            mtime: stat.mtimeMs,
            kind: parsed.data.kind ?? path.basename(path.dirname(full)) ?? '',
            type: parsed.data.type ?? null,
            module: parsed.data.module ?? null,
            summary: parsed.data.summary ?? '',
            tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : parsed.data.tags ? [parsed.data.tags] : [],
            contains: Array.isArray(parsed.data.contains) ? parsed.data.contains : [],
            created: parsed.data.created ?? null,
            updated: parsed.data.updated ?? null,
            case: parsed.data.case ?? null,
            links: extractLinks(text),
            isMaster: entry.name.startsWith('_'),
          })
        }
      }
      walk(root, 0)
    }
    items.sort((a, b) => b.mtime - a.mtime)
    return { items, roots, writePath, isFallback, truncated }
  }

  const readNote = (filePath) => {
    const target = String(filePath ?? '').trim()
    if (!target) throw new Error('缺少笔记路径')
    let text = ''
    try {
      text = fs.readFileSync(target, 'utf8')
    } catch {
      throw new Error(`笔记不存在或不可读：${target}`)
    }
    const parsed = parseFrontmatter(text)
    const title = path.basename(target).replace(/\.(md|markdown)$/i, '')
    return {
      path: target,
      title,
      frontmatter: parsed.data,
      body: parsed.body,
      links: extractLinks(text),
      outgoing: extractLinks(parsed.body),
    }
  }

  /** 按 wikilink 标题找笔记（Obsidian 的双链解析：按文件名匹配，全局唯一） */
  const findByTitle = (title) => {
    const wanted = String(title ?? '').trim().toLowerCase()
    if (!wanted) return null
    const { items } = list()
    return items.find((n) => n.title.toLowerCase() === wanted) ?? items.find((n) => n.title.toLowerCase().includes(wanted)) ?? null
  }

  return { list, readNote, findByTitle, readRoots }
}

// ── 小工具 ──────────────────────────────────────────────────────────────────

function writeJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function writeOk(res, value) {
  writeJson(res, 200, { ok: true, value })
}

function writeError(res, error) {
  const message = error instanceof Error ? error.message : String(error)
  writeJson(res, 200, { ok: false, error: { code: 'internal', message } })
}

async function readJsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  return JSON.parse(text)
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) ?? fallback
  } catch {
    return fallback
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(tmp, file)
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function clip(text, limit) {
  const s = String(text ?? '')
  return s.length <= limit ? s : `${s.slice(0, limit)}…`
}

const DEFAULT_SETTINGS = {
  bilingual: false,
  socratic: true,
  outputStyle: '应试版',
  track: '法考',
  dailyGoal: 10,
  activeCaseId: null,
}

/**
 * 给 Host 服务调用配一个真的 AbortSignal。
 *
 * 为什么必须：`sessionController` 的方法会**直接**调用 `signal.throwIfAborted()`，
 * 不传 signal 就是用户在界面上看到的那句
 * `Cannot read properties of undefined (reading 'throwIfAborted')`。
 * 实测（只读探针，用不存在的会话 id，未发送任何内容）：
 *   prompt(req)           → TypeError: Cannot read properties of undefined (reading 'throwIfAborted')
 *   prompt(req, {})       → TypeError: signal.throwIfAborted is not a function
 *   prompt(req, {throwIfAborted(){}}) → 顺利通过检查，随后正常报 session/not-found
 * Remote 路径由网关补 signal，**Host 直接调服务不会**。
 *
 * 顺带一个超时兜底：准入卡住时不要让工作台的请求一直吊着。
 */
function withSignal(run, timeoutMs = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return Promise.resolve()
    .then(() => run(controller.signal))
    .finally(() => clearTimeout(timer))
}

/**
 * 学习档案读取器。
 * 只读 + 两处受控写入；全部按文件为 authority，不做内存缓存
 * （preset 与工作台可能同时持有同一个目录，缓存就是两份真相）。
 */
function createArchive(dataRoot) {
  const casesDir = path.join(dataRoot, 'cases')
  const exportsDir = path.join(dataRoot, 'exports')

  const settingsFile = path.join(dataRoot, 'settings.json')
  const indexPath = path.join(dataRoot, 'index.json')
  const cardsFile = path.join(dataRoot, 'flashcards.json')
  const wrongFile = path.join(dataRoot, 'wrongbook.json')

  const readSettings = () => ({ ...DEFAULT_SETTINGS, ...readJson(settingsFile, {}) })
  const writeSettings = (next) => {
    writeJsonAtomic(settingsFile, next)
    return next
  }

  const listCases = () => {
    const idx = readJson(indexPath, { cases: [] })
    const rows = Array.isArray(idx.cases) ? idx.cases : []
    return [...rows].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
  }

  const getCase = (id) => {
    if (!id) return null
    const record = readJson(path.join(casesDir, `${id}.json`), null)
    if (!record) return null
    for (const section of SECTIONS) if (!Array.isArray(record[section])) record[section] = []
    return record
  }

  const resolveCase = (id) => {
    if (id) {
      const found = getCase(id)
      if (found) return found
    }
    const active = readSettings().activeCaseId
    const fromActive = getCase(active)
    if (fromActive) return fromActive
    const rows = listCases()
    return rows.length > 0 ? getCase(rows[0].id) : null
  }

  const listCards = () => {
    const all = readJson(cardsFile, [])
    return Array.isArray(all) ? all : []
  }

  const listWrong = () => {
    const all = readJson(wrongFile, [])
    return Array.isArray(all) ? all : []
  }

  const dueCards = () => {
    const now = Date.now()
    return listCards()
      .filter((c) => new Date(c.dueAt ?? 0).getTime() <= now)
      .sort((a, b) => String(a.dueAt ?? '').localeCompare(String(b.dueAt ?? '')))
  }

  const dueWrong = () => {
    const now = Date.now()
    return listWrong().filter((w) => new Date(w.dueAt ?? 0).getTime() <= now)
  }

  /** 一次自测结果落库 —— 与 store.js 的 gradeFlashcard 同口径 */
  const gradeCard = (id, { quality, missed, answer }) => {
    const all = listCards()
    const at = all.findIndex((c) => c.id === id)
    if (at < 0) throw new Error(`找不到背诵卡：${id}`)
    const card = all[at]
    const q = quality ?? 'good'
    let box = card.box ?? 0
    if (q === 'again') box = Math.max(0, box - 2)
    else if (q === 'hard') box = Math.max(0, box)
    else if (q === 'good') box = Math.min(BOX_INTERVALS.length - 1, box + 1)
    else box = Math.min(BOX_INTERVALS.length - 1, box + 2)
    const next = {
      ...card,
      box,
      reps: (card.reps ?? 0) + 1,
      lapses: (card.lapses ?? 0) + (q === 'again' ? 1 : 0),
      dueAt: addDays(BOX_INTERVALS[box]),
      history: [
        ...(card.history ?? []),
        { at: new Date().toISOString(), quality: q, missed: missed ?? [], answer: answer ? clip(answer, 400) : null },
      ].slice(-20),
    }
    all[at] = next
    writeJsonAtomic(cardsFile, all)
    return next
  }

  /** 错题重做记录 —— 与 store.js 的 reviewWrong 同口径 */
  const reviewWrong = (id, { quality }) => {
    const all = listWrong()
    const at = all.findIndex((w) => w.id === id)
    if (at < 0) throw new Error(`找不到错题：${id}`)
    const entry = all[at]
    const reps = (entry.reviews ?? 0) + 1
    const interval = BOX_INTERVALS[Math.min(BOX_INTERVALS.length - 1, reps)]
    all[at] = {
      ...entry,
      reviews: reps,
      lastQuality: quality ?? 'good',
      dueAt: addDays(quality === 'again' ? 0 : interval),
    }
    writeJsonAtomic(wrongFile, all)
    return all[at]
  }

  const stats = () => {
    const rows = listCases()
    const cards = listCards()
    const wrong = listWrong()
    const today = todayIso()
    let facts = 0
    let elements = 0
    let drills = 0
    let moot = 0
    let documents = 0
    for (const row of rows) {
      const record = getCase(row.id)
      if (!record) continue
      facts += record.facts.length
      elements += record.elements.length
      drills += record.drills.length
      moot += record.moot.length
      documents += record.documents.length
    }
    const reviewedToday = cards.reduce(
      (n, c) => n + (c.history ?? []).filter((h) => String(h.at ?? '').slice(0, 10) === today).length,
      0,
    )
    return {
      cases: rows.length,
      facts,
      elements,
      drills,
      moot,
      documents,
      cards: cards.length,
      dueCards: dueCards().length,
      wrong: wrong.length,
      dueWrong: dueWrong().length,
      reviewedToday,
    }
  }

  /** 跨案件聚合「关联法条」：要件清单里记过的规范依据，按出现次数排序 */
  const normIndex = () => {
    const counts = new Map()
    for (const row of listCases()) {
      const record = getCase(row.id)
      if (!record) continue
      for (const element of record.elements) {
        const norm = String(element.norm ?? '').trim()
        if (!norm) continue
        const key = norm
        const entry = counts.get(key) ?? { norm, count: 0, cases: new Set(), elements: [] }
        entry.count += 1
        entry.cases.add(record.title)
        entry.elements.push({ caseTitle: record.title, caseId: record.id, name: element.name, status: element.status })
        counts.set(key, entry)
      }
    }
    return [...counts.values()]
      .map((e) => ({ norm: e.norm, count: e.count, cases: [...e.cases], elements: e.elements.slice(0, 8) }))
      .sort((a, b) => b.count - a.count)
  }

  return {
    root: dataRoot,
    exportsDir,
    readSettings,
    writeSettings,
    listCases,
    getCase,
    resolveCase,
    listCards,
    listWrong,
    dueCards,
    dueWrong,
    gradeCard,
    reviewWrong,
    stats,
    normIndex,
    /** 右侧动态面板的数据：时间线、关联法条、争议焦点、未闭合要件 */
    asideOf(record) {
      if (!record) return { timeline: [], norms: [], focus: [], gaps: [] }
      return {
        timeline: [...record.timeline].sort((a, b) => String(a.at ?? '').localeCompare(String(b.at ?? ''))),
        norms: [...new Set(record.elements.map((e) => e.norm).filter(Boolean))],
        focus: String(record.focus ?? '')
          .split(/[；;、,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
        gaps: record.elements.filter((e) => e.status !== '满足'),
      }
    },
  }
}

/**
 * 明律会话（agent preset = lawagent）的发现与投喂。
 *
 * **为什么不能只看 SessionHeader.agentPreset**：那个字段记的是会话**创建时**的 preset。
 * 用户在会话里把 preset 切成了明律（`agentPresets.select`）时，header 仍然是 standard，
 * 于是「按 header 找明律会话」会一个都找不到 —— 实测就踩到了这个坑。
 *
 * 可靠判定有三条，按可信度取并集：
 *   1. 活着的会话：`agentPresets.composedPreset(agent.ctx) === 'lawagent'` —— 当前真实组合，最权威；
 *   2. `lawdata/sessions.json` 的键 —— 明律插件自己在 `agent/session-start` 时写的，冷会话也算；
 *   3. 兜底：最近若干会话的 `meta.agentPreset`（只在上面两条都为空、且是本进程首次运行时才用）。
 */
function createSessionBridge(ctx, dataRoot, cacheMs = 5000) {
  const controller = () => ctx.get('sessionController')
  let cache = { at: 0, items: [] }

  const sessionsFile = path.join(dataRoot, 'sessions.json')

  /** 明律插件写下的会话绑定键 —— 挂载过明律的会话都在里面（可能含已删除的，后面用会话列表过滤） */
  const archiveSessionKeys = () => {
    try {
      const raw = readJson(sessionsFile, {})
      return raw && typeof raw === 'object' ? Object.keys(raw) : []
    } catch {
      return []
    }
  }

  /** 当前真的跑着明律的活会话（preset 被中途切换也算） */
  const liveLawSessionIds = () => {
    try {
      const agents = ctx.get('agents')
      const presets = ctx.get('agentPresets')
      if (!agents || !presets) return []
      const out = []
      for (const agent of agents.list() ?? []) {
        try {
          if (agent?.ctx && presets.composedPreset(agent.ctx) === 'lawagent') out.push(agent.id)
        } catch {
          /* 单个 agent 读不到就跳过 */
        }
      }
      return out
    } catch {
      return []
    }
  }

  /**
   * 会话标题尽量取真的：`sessionQuery.readTitle` 折叠日志里的标题事件，冷会话也能拿到；
   * 拿不到就退回实时会话的标题，再拿不到返回 null，由客户端显示成「明律会话 · 时间」，不编造。
   */
  const titleFor = async (sessionId) => {
    try {
      const query = ctx.get('sessionQuery')
      if (query) {
        const snapshot = await query.readTitle(sessionId)
        if (snapshot?.title) return snapshot.title
      }
    } catch {
      /* 读不到就用下面的兜底 */
    }
    try {
      const sessions = ctx.get('sessions')
      const titles = ctx.get('sessionTitle')
      if (!sessions || !titles) return null
      const live = sessions.get(sessionId)
      if (!live) return null
      return titles.get(live)?.title ?? null
    } catch {
      return null
    }
  }

  const list = async (force = false) => {
    const now = Date.now()
    if (!force && now - cache.at < cacheMs && cache.items.length > 0) return cache.items
    const sc = controller()
    if (!sc) return []
    let summaries = []
    try {
      const value = await withSignal((signal) => sc.list({}, signal))
      summaries = Array.isArray(value?.items) ? value.items : []
    } catch {
      return []
    }

    // 先取并集，再用会话列表过滤掉已经不存在的 id
    const candidateIds = new Set([...liveLawSessionIds(), ...archiveSessionKeys()])
    const byId = new Map(summaries.map((s) => [s.sessionId, s]))
    const rows = []
    for (const id of candidateIds) {
      const summary = byId.get(id)
      if (summary) rows.push({ summary, id })
    }
    rows.sort((a, b) => (b.summary.updatedAt ?? 0) - (a.summary.updatedAt ?? 0))

    // 兜底：两条信号都没有时（例如刚装好还没用过明律），退回扫最近若干会话的 header
    if (rows.length === 0) {
      const recent = [...summaries].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 80)
      for (const summary of recent) {
        try {
          const inspection = await withSignal((signal) => sc.inspect(summary.sessionId, signal))
          if (inspection?.meta?.agentPreset === 'lawagent') rows.push({ summary, id: summary.sessionId })
        } catch {
          /* 跳过读不到的会话 */
        }
      }
    }

    const items = []
    for (const { summary, id } of rows.slice(0, 20)) {
      items.push({
        sessionId: id,
        title: null,
        cwd: summary.cwd ?? null,
        updatedAt: summary.updatedAt ?? 0,
        running: summary.running === true,
        blank: summary.blank === true,
        live: liveLawSessionIds().includes(id),
      })
    }
    // 标题只给前若干条，避免一次读十几条日志
    await Promise.all(
      items.slice(0, 8).map(async (item) => {
        item.title = await titleFor(item.sessionId)
      }),
    )
    cache = { at: now, items }
    return items
  }

  /** 把一条文本指令投进指定（或最近的）明律会话 */
  const prompt = async (text, sessionId) => {
    const sc = controller()
    if (!sc) throw new Error('sessionController 服务不可用，无法发送指令')
    const body = String(text ?? '').trim()
    if (!body) throw new Error('指令内容为空')
    let target = sessionId
    if (!target) {
      const items = await list(true)
      if (items.length === 0) {
        throw new Error('还没有用「法学学习实训 Agent」开过会话。先新建一个该 preset 的会话，再回来点联动。')
      }
      target = items[0].sessionId
    }
    await withSignal((signal) =>
      sc.prompt(
        {
          requestId: randomUUID(),
          sessionId: target,
          mode: 'queue',
          content: [{ type: 'text', text: body }],
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        signal,
      ),
    )
    cache = { at: 0, items: [] }
    return { sessionId: target, text: body }
  }

  /** 新建一条明律会话（工作台里没有会话时的一键入口） */
  const create = async (cwd) => {
    const sc = controller()
    if (!sc) throw new Error('sessionController 服务不可用，无法新建会话')
    const items = await list(true)
    const target = cwd ?? items[0]?.cwd ?? null
    const value = await sc.create(target ? { agentPreset: 'lawagent', cwd: target } : { agentPreset: 'lawagent' })
    cache = { at: 0, items: [] }
    return { sessionId: value.sessionId, cwd: target }
  }

  /** 只有标题的轻量查询（chat 路由用） */
  const titleOf = titleFor

  const textOfBlocks = (content) =>
    (Array.isArray(content) ? content : [])
      .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim()

  /**
   * 把一条会话的事件流折成「能直接渲染的对话消息」。
   *
   * 优先用 sessionQuery.readSurface：它给的是**当前模型表面**（被替换的事件已经排除），
   * 正是聊天该显示的内容；拿不到就退回 inspect() 的原始事件流，并自行过滤流式分片。
   */
  const readMessages = async (sessionId) => {
    const query = ctx.get('sessionQuery')
    let events = []
    let throughSeq = null
    if (query) {
      try {
        const surface = await query.readSurface(sessionId)
        events = Array.isArray(surface?.events) ? surface.events : []
        throughSeq = surface?.capturedThroughSeq ?? null
      } catch {
        // 表面读失败（例如正在写入的会话）就退回原始事件流，宁可显示得粗一点也不要整块对话打不开
        events = []
        throughSeq = null
      }
    }
    if (events.length === 0) {
      const sc = controller()
      const inspection = await withSignal((signal) => sc.inspect(sessionId, signal))
      events = Array.isArray(inspection?.events) ? inspection.events : []
      const last = events.length > 0 ? events[events.length - 1] : null
      throughSeq = throughSeq ?? (last ? last.seq : null)
    }

    const messages = []
    for (const event of events) {
      const type = event?.type
      if (type === 'user/message') {
        // 工具结果也是 role:'user'，但 source.kind==='tool'，不能混进对话
        const source = event.data?.source?.kind
        if (source && source !== 'user') continue
        const text = textOfBlocks(event.data?.content)
        if (text) messages.push({ seq: event.seq, at: event.time, role: 'user', text })
      } else if (type === 'assistant/message') {
        const text = textOfBlocks(event.data?.message?.content)
        if (text) messages.push({ seq: event.seq, at: event.time, role: 'assistant', text, interrupted: event.data?.interrupted === true })
      } else if (type === 'tool/result') {
        const block = event.data?.message?.content?.[0]
        const text = textOfBlocks(block?.content)
        messages.push({
          seq: event.seq,
          at: event.time,
          role: 'tool',
          toolCallId: block?.toolCallId ?? null,
          error: block?.isError === true,
          text: clip(text, 500),
          chars: text.length,
        })
      }
    }
    return { messages, throughSeq }
  }

  /** 工作台内嵌对话：消息 + 运行状态 + 目标会话 */
  const chat = async (args = {}) => {
    const sc = controller()
    if (!sc) throw new Error('sessionController 服务不可用，无法读取对话')
    let target = args.sessionId ?? null
    if (!target) {
      const items = await list()
      if (items.length === 0) {
        return { sessionId: null, messages: [], running: false, title: null, sessions: [], needsSession: true }
      }
      target = items[0].sessionId
    }
    const [{ messages, throughSeq }, title, sessions] = await Promise.all([
      readMessages(target),
      titleFor(target),
      list(),
    ])
    const summary = sessions.find((s) => s.sessionId === target) ?? null
    return {
      sessionId: target,
      title: title ?? summary?.title ?? null,
      running: summary?.running === true,
      lastSeq: throughSeq,
      messageCount: messages.length,
      messages: messages.slice(-Number(args.limit ?? 120)),
      sessions,
      needsSession: false,
      cwd: summary?.cwd ?? null,
    }
  }

  return { list, prompt, create, chat }
}

// ── 插件 ────────────────────────────────────────────────────────────────────

function apply(ctx, config) {
  const webServer = ctx.webServer
  if (!webServer) {
    ctx.logger?.warn('[lawagent-ui] webServer 不可用，插件未激活')
    return
  }

  const dataRoot = config?.dataRoot ?? process.env.LAWAGENT_DATA_ROOT ?? DEFAULT_DATA_ROOT
  const archive = createArchive(dataRoot)
  const bridge = createSessionBridge(ctx, dataRoot)
  const sources = createSources(dataRoot)
  const notes = createNotes(sources, dataRoot)

  // 首次挂载时目录可能还不存在（preset 还没跑过），这里建出来，让写设置不会失败
  fs.mkdirSync(path.join(dataRoot, 'cases'), { recursive: true })
  fs.mkdirSync(archive.exportsDir, { recursive: true })

  const api = {
    /** 工作台首屏：一次拿齐设置、案件列表、当前案件全档、统计、右侧面板 */
    overview: async (args = {}) => {
      const settings = archive.readSettings()
      const record = archive.resolveCase(args.caseId)
      return {
        dataRoot: archive.root,
        disclaimer: DISCLAIMER,
        settings,
        stats: archive.stats(),
        cases: archive.listCases().map((c) => ({
          id: c.id,
          title: c.title,
          subject: c.subject,
          stage: c.stage,
          updatedAt: c.updatedAt,
          facts: c.facts ?? 0,
          elements: c.elements ?? 0,
          timeline: c.timeline ?? 0,
          drills: c.drills ?? 0,
        })),
        case: record,
        activeCaseId: record?.id ?? null,
        aside: archive.asideOf(record),
        dueCards: archive.dueCards().length,
        dueWrong: archive.dueWrong().length,
        sessions: await bridge.list(),
        serverTime: new Date().toISOString(),
      }
    },

    caseDetail: async (args = {}) => {
      const record = archive.resolveCase(args.caseId)
      if (!record) throw new Error('找不到案件卷宗')
      return { case: record, aside: archive.asideOf(record) }
    },

    setSettings: async (args = {}) => {
      const patch = {}
      if (typeof args.bilingual === 'boolean') patch.bilingual = args.bilingual
      if (typeof args.socratic === 'boolean') patch.socratic = args.socratic
      if (args.outputStyle === '应试版' || args.outputStyle === '学理版') patch.outputStyle = args.outputStyle
      if (typeof args.track === 'string') patch.track = args.track
      if (Number.isFinite(args.dailyGoal)) patch.dailyGoal = Math.max(1, Math.floor(args.dailyGoal))
      return { settings: archive.writeSettings({ ...archive.readSettings(), ...patch }) }
    },

    setActiveCase: async (args = {}) => {
      const record = archive.getCase(args.caseId)
      if (!record) throw new Error(`找不到案件：${args.caseId ?? '(空)'}`)
      archive.writeSettings({ ...archive.readSettings(), activeCaseId: record.id })
      return { case: record, aside: archive.asideOf(record) }
    },

    /** 跨案件的关联法条索引（法条库页用） */
    norms: async () => ({ norms: archive.normIndex() }),

    cards: async (args = {}) => {
      const settings = archive.readSettings()
      const all = archive.listCards()
      const due = archive.dueCards()
      const cards = args.dueOnly === true ? due : all
      return {
        cards,
        total: all.length,
        dueCount: due.length,
        reviewedToday: archive.stats().reviewedToday,
        dailyGoal: settings.dailyGoal,
      }
    },

    gradeCard: async (args = {}) => ({ card: archive.gradeCard(args.id, args) }),

    wrong: async (args = {}) => {
      const all = archive.listWrong()
      const due = archive.dueWrong()
      return { items: args.dueOnly === true ? due : all, total: all.length, dueCount: due.length }
    },

    reviewWrong: async (args = {}) => ({ item: archive.reviewWrong(args.id, args) }),

    /** 明律会话清单：客户端用它显示「指令将发往哪条会话」 */
    sessions: async () => ({ items: await bridge.list(true) }),

    /** 联动按钮的真正落点：把指令送进明律会话 */
    prompt: async (args = {}) => {
      const result = await bridge.prompt(args.text, args.sessionId)
      return { ...result, ok: true }
    },

    /** 工作台内嵌对话：拉取当前表面折成的消息列表 + 运行状态 */
    chat: async (args = {}) => bridge.chat(args),

    /** 新建一条明律会话（没有会话时的一键入口） */
    newSession: async (args = {}) => bridge.create(args.cwd ?? config?.defaultCwd),

    exportAnki: async () => {
      const cards = archive.listCards()
      if (cards.length === 0) throw new Error('背诵库是空的，没有可导出的卡片')
      const cell = (v) => {
        const s = String(v ?? '').replace(/\r?\n/g, '<br>')
        return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const rows = ['front,back,tags']
      for (const card of cards) {
        const back = [card.back, card.points?.length ? `必答要点：${card.points.join('；')}` : ''].filter(Boolean).join('\n')
        rows.push([cell(card.front), cell(back), cell((card.tags ?? []).join(' '))].join(','))
      }
      const file = path.join(archive.exportsDir, `背诵卡-${todayIso()}.csv`)
      fs.writeFileSync(file, `${rows.join('\n')}\n`, 'utf8')
      return { path: file, count: cards.length }
    },

    /** 在资源管理器中打开导出目录 / 学习档案目录 / 指定路径 */
    openFolder: async (args = {}) => {
      const target = args.path
        ? String(args.path)
        : args.which === 'root'
          ? archive.root
          : args.which === 'notes'
            ? notes.readRoots().writePath
            : archive.exportsDir
      if (!fs.existsSync(target)) throw new Error(`目录不存在：${target}`)
      spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' }).unref()
      return { path: target }
    },

    /** 模块资料来源：列出 / 增删 / 屏蔽 / 设写入目录 */
    sources: async () => {
      const state = sources.read()
      const out = []
      for (const spec of MODULES) {
        const module = state.modules[spec.key]
        out.push({
          key: spec.key,
          label: spec.label,
          dirs: module.dirs,
          writePath: module.writePath,
          enabledCount: module.dirs.filter((d) => d.enabled && !d.missing).length,
          missingCount: module.dirs.filter((d) => d.missing).length,
        })
      }
      const notesRoots = notes.readRoots()
      return {
        modules: out,
        notes: { roots: notesRoots.roots, writePath: notesRoots.writePath, isFallback: notesRoots.isFallback },
        textExtensions: [...TEXT_EXT],
        listExtensions: [...LIST_EXT],
      }
    },

    addSource: async (args = {}) => ({ sources: (await Promise.resolve(sources.add(args.module, args.path))).modules[args.module] }),

    removeSource: async (args = {}) => ({ sources: sources.remove(args.module, args.path).modules[args.module] }),

    toggleSource: async (args = {}) => ({ sources: sources.toggle(args.module, args.path, args.enabled).modules[args.module] }),

    setNotesWritePath: async (args = {}) => {
      const moduleKey = args.module ?? 'notes'
      const state = sources.setWritePath(moduleKey, args.path ?? null)
      return { sources: state.modules[moduleKey], notes: notes.readRoots() }
    },

    /** 扫某个模块的所有启用文件夹，返回文件清单 */
    scanModule: async (args = {}) => sources.scan(args.module),

    /** 读一个资料文件（文本类直接给内容，其余给提示） */
    readFile: async (args = {}) => sources.readSourceFile(args.path),

    /** 列出笔记（Obsidian 双链笔记），带 frontmatter 摘要与出链 */
    notes: async () => notes.list(),

    /** 读一篇笔记：frontmatter + 正文 + [[双链]] */
    readNote: async (args = {}) => notes.readNote(args.path),

    /** 按 [[标题]] 解析到笔记（工作台里点双链就靠它） */
    resolveWiki: async (args = {}) => {
      const found = notes.findByTitle(args.title)
      if (!found) throw new Error(`没有找到笔记：${args.title}`)
      return { note: found, content: notes.readNote(found.path) }
    },

    /** 打开明律会话（客户端也能自己调 ctx.sessions.open，这里给不支持时的兜底） */
    focusSession: async (args = {}) => {
      const items = await bridge.list(true)
      if (items.length === 0) throw new Error('还没有明律会话')
      const target = args.sessionId ? items.find((s) => s.sessionId === args.sessionId) : items[0]
      if (!target) throw new Error('找不到该会话')
      return { sessionId: target.sessionId }
    },
  }

  ctx.effect(
    () =>
      webServer.register({
        kind: 'prefix',
        path: '/lawui/api',
        handler: async (req, res) => {
          if (req.headers['sec-fetch-site'] === 'cross-site') {
            writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'cross-site blocked' } })
            return
          }
          const pathname = new URL(req.url || '/', 'http://dsh.internal').pathname
          const method = pathname.startsWith('/lawui/api/') ? pathname.slice('/lawui/api/'.length) : ''
          if (!method || method.includes('/')) {
            writeJson(res, 404, { ok: false, error: { code: 'not-found', message: 'unknown method' } })
            return
          }
          const handler = api[method]
          if (!handler) {
            writeJson(res, 404, { ok: false, error: { code: 'not-found', message: `unknown method ${method}` } })
            return
          }
          try {
            writeOk(res, await handler(await readJsonBody(req)))
          } catch (error) {
            writeError(res, error)
          }
        },
      }),
    'lawagent-ui: /lawui/api routes',
  )

  console.log(`[lawagent-ui] 法学学习实训工作台已挂载。学习档案：${dataRoot}`)
}

export { name, inject, apply }
export const internals = { createArchive, BOX_INTERVALS, SECTIONS, DEFAULT_DATA_ROOT, DISCLAIMER }
