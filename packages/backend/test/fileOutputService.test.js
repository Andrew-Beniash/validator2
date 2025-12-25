import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { writeMethodFilesForSession } from '../src/fileOutputService.js'

describe('fileOutputService.writeMethodFilesForSession', () => {
  const originalTmpDir = process.env.ANALYSIS_TMP_DIR
  let tmpDir

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `validator-analysis-test-${Date.now()}`)
    process.env.ANALYSIS_TMP_DIR = tmpDir
    await fs.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    process.env.ANALYSIS_TMP_DIR = originalTmpDir
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  test('writes one .txt file per completed step', async () => {
    const session = {
      id: 'session123',
      results: {
        analysis: {
          steps: [
            {
              id: 'jtbd',
              name: 'Jobs-to-be-Done',
              status: 'completed',
              result: { content: 'JTBD output' }
            },
            {
              id: 'designThinking',
              name: 'Design Thinking',
              status: 'completed',
              result: { content: 'Design output' }
            },
            {
              id: 'leanCanvas',
              name: 'Lean Canvas',
              status: 'pending',
              result: null
            }
          ]
        }
      }
    }

    const files = await writeMethodFilesForSession(session)

    assert.strictEqual(files.length, 2)

    for (const fileInfo of files) {
      const fullPath = fileInfo.filepath
      const stats = await fs.stat(fullPath)
      assert.ok(stats.isFile())

      const content = await fs.readFile(fullPath, 'utf8')
      assert.ok(content.includes(fileInfo.methodName))
      assert.ok(content.includes('Generated at:'))
      assert.ok(content.includes(fileInfo.methodId === 'jtbd' ? 'JTBD output' : 'Design output'))
    }
  })

  test('handles missing content with placeholder text', async () => {
    const session = {
      id: 'session456',
      results: {
        analysis: {
          steps: [
            {
              id: 'leanCanvas',
              name: 'Lean Canvas',
              status: 'completed',
              result: null
            }
          ]
        }
      }
    }

    const [fileInfo] = await writeMethodFilesForSession(session)
    const content = await fs.readFile(fileInfo.filepath, 'utf8')
    assert.ok(content.includes('Lean Canvas'))
    assert.ok(content.includes('No content available for this method.'))
  })

  test('throws FILE_WRITE_ERROR when write fails', async () => {
    const badDir = path.join(tmpDir, 'no-permission')
    // Simulate failure by setting ANALYSIS_TMP_DIR to a path inside tmpDir and removing permissions
    process.env.ANALYSIS_TMP_DIR = badDir

    const session = {
      id: 'session789',
      results: {
        analysis: {
          steps: [
            {
              id: 'jtbd',
              name: 'Jobs-to-be-Done',
              status: 'completed',
              result: { content: 'JTBD output' }
            }
          ]
        }
      }
    }

    // For portability, we simulate write failure by monkeypatching fs.writeFile
    const realWriteFile = fs.writeFile
    fs.writeFile = async () => {
      const err = new Error('simulated failure')
      err.code = 'EACCES'
      throw err
    }

    await assert.rejects(
      () => writeMethodFilesForSession(session),
      err => err.type === 'FILE_WRITE_ERROR'
    )

    fs.writeFile = realWriteFile
  })
})

