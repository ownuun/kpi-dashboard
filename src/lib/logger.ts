type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogMeta = Record<string, unknown>

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
}

function formatError(error: Error): LogMeta {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, meta))
    }
  },

  info(message: string, meta?: LogMeta) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, meta))
    }
  },

  warn(message: string, meta?: LogMeta) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta))
    }
  },

  error(message: string, error?: Error | unknown, meta?: LogMeta) {
    if (shouldLog('error')) {
      const errorMeta = error instanceof Error ? formatError(error) : { error }
      console.error(formatMessage('error', message, { ...errorMeta, ...meta }))

      // TODO: Sentry integration - install @sentry/nextjs and uncomment:
      // if (process.env.SENTRY_DSN) {
      //   import('@sentry/nextjs').then((Sentry) => {
      //     if (error instanceof Error) {
      //       Sentry.captureException(error, { extra: meta })
      //     } else {
      //       Sentry.captureMessage(message, { extra: { ...meta, error } })
      //     }
      //   }).catch(() => {})
      // }
    }
  },
}

export default logger
