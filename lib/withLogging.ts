import { NextApiRequest, NextApiResponse } from 'next'

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<any> | any

/**
 * Wraps an API handler to log method, path, status code, duration, and errors.
 */
export function withLogging(handler: Handler): Handler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now()
    const { method, url } = req

    // Intercept res.status() and res.end() / res.json() to capture status code
    const originalStatus = res.status.bind(res)
    const originalJson = res.json.bind(res)
    const originalEnd = res.end.bind(res)

    let statusCode = 200

    res.status = (code: number) => {
      statusCode = code
      return originalStatus(code)
    }

    const logFinish = () => {
      const ms = Date.now() - start
      const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO'
      console.log(`[api] ${level} ${method} ${url} → ${statusCode} (${ms}ms)`)
    }

    res.json = (body: any) => {
      logFinish()
      return originalJson(body)
    }

    res.end = (...args: any[]) => {
      logFinish()
      return originalEnd(...args)
    }

    try {
      await handler(req, res)
    } catch (err: any) {
      const ms = Date.now() - start
      console.error(`[api] UNCAUGHT ${method} ${url} (${ms}ms)`, err?.stack || err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'server error' })
      }
    }
  }
}
