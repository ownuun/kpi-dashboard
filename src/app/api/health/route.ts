import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        status: 'ok',
        timestamp,
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error'

    return NextResponse.json(
      {
        status: 'error',
        timestamp,
        database: 'disconnected',
        error: errorMessage,
      },
      { status: 503 }
    )
  }
}
