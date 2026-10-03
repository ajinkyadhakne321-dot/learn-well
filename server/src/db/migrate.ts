import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

try {
  const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url))
  const schema = await readFile(schemaPath, 'utf8')
  await pool.query(schema)
  console.info('Database schema is up to date.')
} catch (error) {
  console.error('Database migration failed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}