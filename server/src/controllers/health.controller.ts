import type { RequestHandler } from 'express'
import { pool } from '../db/pool.js'

export const getHealth: RequestHandler = async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    response.json({ status: 'ok', database: 'connected' })
  } catch {
    response.status(503).json({ status: 'error', database: 'unavailable' })
  }
}