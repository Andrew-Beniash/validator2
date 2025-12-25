import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { METHODOLOGY_STEPS } from './promptTemplates.js'

/**
 * Mapping from methodology IDs to stable file keys
 * used in filenames.
 */
export const METHOD_FILE_KEYS = {
  jtbd: 'JTBD',
  designThinking: 'DesignThinking',
  leanCanvas: 'LeanCanvas',
  rootCause: 'RootCauseAnalysis',
  ost: 'OpportunityTree'
}

/**
 * Resolve base directory for analysis output files.
 * Prefers ANALYSIS_TMP_DIR, otherwise uses os.tmpdir()/validator-analysis.
 */
export function getBaseOutputDir() {
  const envDir = process.env.ANALYSIS_TMP_DIR
  if (envDir && envDir.trim()) {
    return envDir
  }
  return path.join(os.tmpdir(), 'validator-analysis')
}

export function sanitizeFilenamePart(part) {
  return String(part || '')
    .trim()
    .replace(/[^a-z0-9_-]/gi, '_')
}

export function getMethodKeyFromId(methodId) {
  return METHOD_FILE_KEYS[methodId] || sanitizeFilenamePart(methodId || 'method')
}

/**
 * Write .txt files for each completed methodology result in the session.
 *
 * @param {object} session - Session object containing results.analysis
 * @returns {Promise<Array<{methodId: string, methodName: string, filename: string, filepath: string}>>}
 */
export async function writeMethodFilesForSession(session) {
  if (!session?.results?.analysis || !Array.isArray(session.results.analysis.steps)) {
    const err = new Error('Analysis results not found on session')
    err.type = 'FILE_OUTPUT_INPUT_ERROR'
    throw err
  }

  const analysis = session.results.analysis
  const sessionId = sanitizeFilenamePart(session.id || session.sessionId || 'session')
  const baseDir = getBaseOutputDir()

  try {
    await fs.mkdir(baseDir, { recursive: true })
  } catch (error) {
    const err = new Error('Failed to create analysis output directory')
    err.type = 'FILE_WRITE_ERROR'
    err.cause = error
    throw err
  }

  const files = []
  const generatedAt = new Date().toISOString()

  for (const step of analysis.steps) {
    if (step.status !== 'completed') {
      continue
    }

    const methodId = step.id
    const methodName = step.name || methodId
    const key = getMethodKeyFromId(methodId)
    const filename = `${sessionId}_${key}.txt`
    const filepath = path.join(baseDir, filename)

    const content = step.result?.content
    const body =
      typeof content === 'string' && content.trim().length > 0
        ? content
        : 'No content available for this method.'

    const fileText = [
      `${methodName}`,
      `Generated at: ${generatedAt}`,
      '',
      body
    ].join('\n')

    try {
      await fs.writeFile(filepath, fileText, { encoding: 'utf8' })
    } catch (error) {
      const err = new Error(`Failed to write analysis file for method ${methodId}`)
      err.type = 'FILE_WRITE_ERROR'
      err.cause = error
      throw err
    }

    files.push({
      methodId,
      methodName,
      filename,
      filepath
    })
  }

  return files
}
