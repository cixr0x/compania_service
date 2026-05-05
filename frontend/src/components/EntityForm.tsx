import type { FormEvent } from 'react'
import type { EntityConfig, EntityRow } from '../features/entities/entityConfigs'

type EntityFormProps = {
  config: EntityConfig
  values: EntityRow
  onChange: (name: string, value: string) => void
  onSubmit: () => void
  isSaving?: boolean
  errorMessage?: string | null
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
          const inputValue =
            value === null || value === undefined ? '' : String(value)

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
                  step={field.type === 'number' ? 'any' : undefined}
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
