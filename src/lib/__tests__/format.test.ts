import { describe, it, expect } from 'vitest'
import {
  formatKRW,
  formatKRWParts,
  formatNumber,
  formatPercent,
  formatDate,
  formatShortDate,
} from '../format'

describe('formatKRW', () => {
  it('formats positive numbers with KRW currency symbol', () => {
    expect(formatKRW(1000)).toBe('₩1,000')
    expect(formatKRW(1234567)).toBe('₩1,234,567')
  })

  it('formats negative numbers', () => {
    expect(formatKRW(-1000)).toBe('-₩1,000')
    expect(formatKRW(-1234567)).toBe('-₩1,234,567')
  })

  it('formats zero', () => {
    expect(formatKRW(0)).toBe('₩0')
  })

  it('formats large numbers', () => {
    expect(formatKRW(1000000000)).toBe('₩1,000,000,000')
  })
})

describe('formatKRWParts', () => {
  it('returns symbol and number separately', () => {
    const result = formatKRWParts(1234567)
    expect(result.symbol).toBe('₩')
    expect(result.number).toBe('1,234,567')
  })

  it('handles negative numbers', () => {
    const result = formatKRWParts(-1000)
    expect(result.symbol).toBe('₩')
    expect(result.number).toBe('-1,000')
  })

  it('handles zero', () => {
    const result = formatKRWParts(0)
    expect(result.symbol).toBe('₩')
    expect(result.number).toBe('0')
  })
})

describe('formatNumber', () => {
  it('formats numbers with thousand separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(1000)).toBe('1,000')
  })

  it('handles negative numbers', () => {
    expect(formatNumber(-1234567)).toBe('-1,234,567')
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('handles decimal numbers (truncates in Korean locale)', () => {
    const result = formatNumber(1234.567)
    expect(result).toContain('1,234')
  })
})

describe('formatPercent', () => {
  it('formats positive percentages with + sign', () => {
    expect(formatPercent(12.5)).toBe('+12.5%')
    expect(formatPercent(100)).toBe('+100.0%')
  })

  it('formats negative percentages', () => {
    expect(formatPercent(-12.5)).toBe('-12.5%')
    expect(formatPercent(-0.5)).toBe('-0.5%')
  })

  it('formats zero with + sign', () => {
    expect(formatPercent(0)).toBe('+0.0%')
  })

  it('rounds to one decimal place', () => {
    expect(formatPercent(12.567)).toBe('+12.6%')
    expect(formatPercent(12.544)).toBe('+12.5%')
  })
})

describe('formatDate', () => {
  it('formats Date objects', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date)
    expect(result).toMatch(/2024.*01.*15/)
  })

  it('formats date strings', () => {
    const result = formatDate('2024-06-30')
    expect(result).toMatch(/2024.*06.*30/)
  })
})

describe('formatShortDate', () => {
  it('formats with month and day only', () => {
    const date = new Date('2024-03-25')
    const result = formatShortDate(date)
    expect(result).toMatch(/03.*25/)
    expect(result).not.toContain('2024')
  })

  it('formats date strings', () => {
    const result = formatShortDate('2024-12-01')
    expect(result).toMatch(/12.*01/)
  })
})
