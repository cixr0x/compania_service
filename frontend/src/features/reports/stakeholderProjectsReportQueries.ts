export const stakeholderProjectsReportPath = '/reports/stakeholder-projects'

const reportKey = ['reports', 'stakeholder-projects'] as const

export const stakeholderProjectsReportKeys = {
  stakeholders: [...reportKey, 'stakeholders'] as const,
  projects: (stakeholderId: number) =>
    [...reportKey, 'stakeholders', stakeholderId] as const,
  detail: (projectId: number | null, stakeholderId: number | null) =>
    [...reportKey, projectId, stakeholderId] as const,
  project: (projectId: number | null) =>
    [...reportKey, 'project', projectId] as const,
}

export function buildStakeholderProjectsPath(stakeholderId: number) {
  return `${stakeholderProjectsReportPath}?stakeholderId=${stakeholderId}`
}

export function buildProjectReportPath(
  projectId: number,
  stakeholderId: number,
) {
  return `${stakeholderProjectsReportPath}?projectId=${projectId}&stakeholderId=${stakeholderId}`
}
