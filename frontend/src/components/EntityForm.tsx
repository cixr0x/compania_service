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

export function EntityForm({
  config,
  values,
  onChange,
  onSubmit,
  isSaving = false,
  errorMessage = null,
}: EntityFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {errorMessage ? (
        <div className="form-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="form-grid">
        {config.fields.map((field) => {
          const value = values[field.name]
          const inputValue = getInputValue(field, value)

          return (
            <label className="form-field" key={field.name}>
              <span>{field.label}</span>
              {field.type === 'textarea' ? (
                <textarea
                  onChange={(event) =>
                    onChange(field.name, event.target.value)
                  }
                  rows={4}
                  value={inputValue}
                />
              ) : (
                <input
                  onChange={(event) =>
                    onChange(field.name, event.target.value)
                  }
                  max={field.max}
                  min={field.min}
                  step={
                    field.type === 'number' ? field.step ?? 'any' : undefined
                  }
                  type={field.type}
                  value={inputValue}
                />
              )}
            </label>
          )
        })}
      </div>

      <div className="form-actions">
        <button className="primary-action" disabled={isSaving} type="submit">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
