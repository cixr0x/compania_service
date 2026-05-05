import type { FormEvent } from 'react'
import type {
  EntityConfig,
  EntityField,
  EntityRow,
} from '../features/entities/entityConfigs'

type EntityFormProps = {
  config: EntityConfig
  values: EntityRow
  onChange: (name: string, value: string) => void
  onSubmit: () => void
  isSaving?: boolean
  errorMessage?: string | null
}

function normalizeDateValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  }

  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  const dateMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})/)
  return dateMatch?.[1] ?? ''
}

function getInputValue(field: EntityField, value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (field.type === 'date') {
    return normalizeDateValue(value)
  }

  return String(value)
}

function groupFields(fields: EntityField[]) {
  const groups: { fields: EntityField[]; title: string | null }[] = []

  fields.forEach((field) => {
    const title = field.section ?? null
    const currentGroup = groups[groups.length - 1]

    if (!currentGroup || currentGroup.title !== title) {
      groups.push({ title, fields: [field] })
      return
    }

    currentGroup.fields.push(field)
  })

  return groups
}

export function EntityForm({
  config,
  values,
  onChange,
  onSubmit,
  isSaving = false,
  errorMessage = null,
}: EntityFormProps) {
  const fieldGroups = groupFields(config.fields)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function renderField(field: EntityField) {
    const value = values[field.name]
    const inputValue = getInputValue(field, value)
    const helperId = field.helperText
      ? `${config.path}-${field.name}-helper`
      : undefined
    const fieldId = `${config.path}-${field.name}-field`
    const fieldClassName =
      field.span === 'full' ? 'form-field form-field-full' : 'form-field'
    const controlClassName =
      field.prefix || field.suffix
        ? 'field-control field-control-adorned'
        : 'field-control'

    return (
      <div className={fieldClassName} key={field.name}>
        <span className="field-label-row">
          <label htmlFor={fieldId}>{field.label}</label>
          {field.required ? (
            <span aria-hidden="true" className="field-required">
              Required
            </span>
          ) : null}
        </span>
        <span className={controlClassName}>
          {field.prefix ? (
            <span aria-hidden="true" className="field-adornment">
              {field.prefix}
            </span>
          ) : null}
          {field.type === 'textarea' ? (
            <textarea
              aria-describedby={helperId}
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.value)}
              required={field.required}
              rows={4}
              value={inputValue}
            />
          ) : field.type === 'select' ? (
            <select
              aria-describedby={helperId}
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.value)}
              required={field.required}
              value={inputValue}
            >
              <option value="">Select...</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              aria-describedby={helperId}
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.value)}
              max={field.max}
              min={field.min}
              required={field.required}
              step={field.type === 'number' ? field.step ?? 'any' : undefined}
              type={field.type}
              value={inputValue}
            />
          )}
          {field.suffix ? (
            <span aria-hidden="true" className="field-adornment">
              {field.suffix}
            </span>
          ) : null}
        </span>
        {field.helperText ? (
          <span className="field-helper" id={helperId}>
            {field.helperText}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <form
      className={
        config.formLayout === 'compact'
          ? 'entity-form entity-form-compact'
          : 'entity-form'
      }
      onSubmit={handleSubmit}
    >
      {errorMessage ? (
        <div className="form-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {fieldGroups.map((group, index) =>
        group.title ? (
          <fieldset className="form-section" key={group.title}>
            <legend>{group.title}</legend>
            <div className="form-grid">{group.fields.map(renderField)}</div>
          </fieldset>
        ) : (
          <div className="form-grid" key={`fields-${index}`}>
            {group.fields.map(renderField)}
          </div>
        ),
      )}

      <div className="form-actions">
        <button className="primary-action" disabled={isSaving} type="submit">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
