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

  it('keeps the sales import staged rows table constrained inside its panel', () => {
    expect(tableCss).toContain('.import-stage-table')
    expect(tableCss).toContain('.import-section > .ant-spin')
    expect(tableCss).toContain('.import-stage-table .ant-table')
    expect(tableCss).toContain('.import-stage-table .ant-table-container')
    expect(tableCss).toContain('.import-stage-table .ant-table-content')
    expect(tableCss).toContain('text-overflow: ellipsis')
  })
})
