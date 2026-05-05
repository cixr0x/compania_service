import { useState, type FormEvent } from 'react'
import type {
  EntityConfig,
  EntityField,
  EntityRow,
} from '../features/entities/entityConfigs'
import { formatMoney } from '../utils/money'

type EntityFormProps = {
  config: EntityConfig
  values: EntityRow
  onChange: (name: string, value: boolean | string) => void
  onSubmit: () => void
  isCreate?: boolean
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

function getInputValue(
  field: EntityField,
  value: unknown,
  isFocused = false,
): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (field.type === 'date') {
    return normalizeDateValue(value)
  }

  if (field.valueFormat === 'money' && !isFocused) {
    return formatMoney(value)
  }

  return String(value)
}

function getCheckboxValue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
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

function getPreviewValue(values: EntityRow, fieldName: string | undefined) {
  if (!fieldName) {
    return ''
  }

  const value = values[fieldName]
  return typeof value === 'string' ? value.trim() : ''
}

function ImageUrlPreview({
  altText,
  imageUrl,
}: {
  altText: string
  imageUrl: string
}) {
  if (!imageUrl) {
    return (
      <div className="image-preview-placeholder">
        Add an image URL to preview it here.
      </div>
    )
  }

  return (
    <div className="image-preview-frame">
      <img alt={altText} src={imageUrl} />
    </div>
  )
}

export function EntityForm({
  config,
  values,
  onChange,
  onSubmit,
  isCreate = false,
  isSaving = false,
  errorMessage = null,
}: EntityFormProps) {
  const fieldGroups = groupFields(config.fields)
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function renderField(field: EntityField) {
    const value = values[field.name]
    const inputValue = getInputValue(
      field,
      value,
      focusedFieldName === field.name,
    )
    const helperId = field.helperText
      ? `${config.path}-${field.name}-helper`
      : undefined
    const fieldId = `${config.path}-${field.name}-field`
    const fieldClassName =
      field.span === 'full' ? 'form-field form-field-full' : 'form-field'
    const isRequired = Boolean(
      field.required || (field.requiredOnCreate && isCreate),
    )
    const controlClassName =
      field.type === 'checkbox'
        ? 'field-control checkbox-control'
        : field.prefix || field.suffix
        ? 'field-control field-control-adorned'
        : 'field-control'
    const isMoneyField = field.valueFormat === 'money'

    if (field.type === 'imagePreview') {
      const imageUrl = getPreviewValue(values, field.previewSourceField)
      const previewName = getPreviewValue(values, field.previewAltField)
      const altText = `${previewName || config.singularTitle} image preview`

      return (
        <div className="form-field image-preview-field" key={field.name}>
          <span className="field-label-row">
            <span>{field.label}</span>
          </span>
          <ImageUrlPreview altText={altText} imageUrl={imageUrl} />
        </div>
      )
    }

    return (
      <div className={fieldClassName} key={field.name}>
        <span className="field-label-row">
          <label htmlFor={fieldId}>{field.label}</label>
          {isRequired ? (
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
              required={isRequired}
              rows={4}
              value={inputValue}
            />
          ) : field.type === 'checkbox' ? (
            <input
              aria-describedby={helperId}
              checked={getCheckboxValue(value)}
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.checked)}
              type="checkbox"
            />
          ) : field.type === 'select' ? (
            <select
              aria-describedby={helperId}
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.value)}
              required={isRequired}
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
              inputMode={isMoneyField ? 'decimal' : undefined}
              onBlur={() => {
                if (isMoneyField) {
                  setFocusedFieldName((currentFieldName) =>
                    currentFieldName === field.name ? null : currentFieldName,
                  )
                }
              }}
              onChange={(event) => onChange(field.name, event.target.value)}
              onFocus={() => {
                if (isMoneyField) {
                  setFocusedFieldName(field.name)
                }
              }}
              max={field.max}
              min={field.min}
              required={isRequired}
              step={
                field.type === 'number' && !isMoneyField
                  ? (field.step ?? 'any')
                  : undefined
              }
              type={isMoneyField ? 'text' : field.type}
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
