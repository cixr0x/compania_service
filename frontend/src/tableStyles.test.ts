/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const tableCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('global table styling', () => {
  it('keeps Ant Design tables compact and striped across the app', () => {
    expect(tableCss).toContain('.ant-table-wrapper .ant-table')
    expect(tableCss).toContain('font-size: 13px')
    expect(tableCss).toContain('padding: 7px 10px')
    expect(tableCss).toContain(
      '.ant-table-wrapper .ant-table-tbody > tr.ant-table-row:nth-child(even) > td',
    )
    expect(tableCss).toContain('background: var(--table-stripe-bg)')
  })
})
