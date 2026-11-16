import { useQuery } from '@tanstack/react-query'
import { Alert, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import type { NavigateFunction } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { getJson } from '../../api/client'
import type {
  StakeholderProjectCount,
  StakeholderProjectSummary,
  StakeholderProjectSummaryRow,
} from '../../api/types'
import { formatCurrency } from '../../utils/money'
import {
  buildProjectReportPath,
  buildStakeholderProjectsPath,
  stakeholderProjectsReportKeys,
  stakeholderProjectsReportPath,
} from './stakeholderProjectsReportQueries'

const stakeholdersPath = `${stakeholderProjectsReportPath}/stakeholders`
const tablePagination = { hideOnSinglePage: true, showSizeChanger: false }
const stakePercentageFormatter = new Intl.NumberFormat('es-MX', {
  style: 'percent',
  maximumFractionDigits: 2,
})

function getRowLinkProps(path: string, navigate: NavigateFunction) {
  return {
    onClick: (event: MouseEvent<HTMLTableRowElement>) => {
      if (event.target instanceof Element && !event.target.closest('a')) {
        void navigate(path)
      }
    },
  }
}

const stakeholderColumns: TableColumnsType<StakeholderProjectCount> = [
  {
    dataIndex: 'stakeholderName',
    render: (name: string, row) => (
      <Link to={buildStakeholderProjectsPath(row.stakeholderId)}>
        {name || `Socio #${row.stakeholderId}`}
      </Link>
    ),
    title: 'Socio',
  },
  { align: 'right', dataIndex: 'projectCount', title: 'Proyectos' },
]

export function StakeholderProjectCounts() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: stakeholderProjectsReportKeys.stakeholders,
    queryFn: () => getJson<StakeholderProjectCount[]>(stakeholdersPath),
  })

  if (query.isError) {
    return (
      <Alert showIcon title="No se pudieron cargar los socios." type="error" />
    )
  }

  return (
    <Table<StakeholderProjectCount>
      className="stakeholder-report-list"
      columns={stakeholderColumns}
      dataSource={query.data ?? []}
      loading={query.isLoading}
      locale={{
        emptyText: query.isLoading ? null : 'No se encontraron socios.',
      }}
      onRow={(row) =>
        getRowLinkProps(
          buildStakeholderProjectsPath(row.stakeholderId),
          navigate,
        )
      }
      pagination={tablePagination}
      rowClassName="stakeholder-report-link-row"
      rowKey="stakeholderId"
      size="small"
    />
  )
}

export function ProjectsForStakeholder({
  stakeholderId,
}: {
  stakeholderId: number
}) {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: stakeholderProjectsReportKeys.projects(stakeholderId),
    queryFn: () =>
      getJson<StakeholderProjectSummary>(
        `${stakeholdersPath}/${stakeholderId}`,
      ),
  })
  const columns: TableColumnsType<StakeholderProjectSummaryRow> = [
    {
      dataIndex: 'projectName',
      render: (name: string, row) => (
        <Link to={buildProjectReportPath(row.projectId, stakeholderId)}>
          {name || `Proyecto #${row.projectId}`}
        </Link>
      ),
      title: 'Proyecto',
    },
    {
      align: 'right',
      dataIndex: 'stakePercentage',
      render: (percentage: number) =>
        stakePercentageFormatter.format(percentage / 100),
      title: 'Participación %',
    },
    {
      align: 'right',
      dataIndex: 'investment',
      render: formatCurrency,
      title: 'Saldo de inversión',
    },
    {
      align: 'right',
      dataIndex: 'payments',
      render: formatCurrency,
      title: 'Pagos',
    },
    {
      align: 'right',
      dataIndex: 'income',
      render: formatCurrency,
      title: 'Ingreso correspondiente',
    },
    {
      align: 'right',
      dataIndex: 'balance',
      render: formatCurrency,
      title: 'Saldo',
    },
  ]

  if (query.isError) {
    return (
      <Alert
        showIcon
        title="No se pudieron cargar los proyectos del socio."
        type="error"
      />
    )
  }

  return (
    <div className="stakeholder-report-list">
      {query.data ? (
        <Typography.Title level={3}>
          {query.data.stakeholderName || `Socio #${stakeholderId}`}
        </Typography.Title>
      ) : null}
      <Table<StakeholderProjectSummaryRow>
        columns={columns}
        dataSource={query.data?.projects ?? []}
        loading={query.isLoading}
        locale={{
          emptyText: query.isLoading ? null : 'Este socio no tiene proyectos.',
        }}
        onRow={(row) =>
          getRowLinkProps(
            buildProjectReportPath(row.projectId, stakeholderId),
            navigate,
          )
        }
        pagination={tablePagination}
        rowClassName="stakeholder-report-link-row"
        rowKey="projectId"
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </div>
  )
}
