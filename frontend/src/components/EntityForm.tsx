import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
} from 'antd'
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
  children?: ReactNode
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

function isFieldRequired(field: EntityField, isCreate: boolean): boolean {
  return Boolean(field.required || (field.requiredOnCreate && isCreate))
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
      <Typography.Text className="image-preview-placeholder" type="secondary">
        Add an image URL to preview it here.
      </Typography.Text>
    )
  }

  return (
    <div className="image-preview-frame">
      <Image alt={altText} preview={false} src={imageUrl} />
    </div>
  )
}

export function EntityForm({
  config,
  values,
  onChange,
  onSubmit,
  children,
  isCreate = false,
  isSaving = false,
  errorMessage = null,
}: EntityFormProps) {
  const fieldGroups = groupFields(config.fields)
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const moneyInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useLayoutEffect(() => {
    if (focusedFieldName) {
      moneyInputRefs.current[focusedFieldName]?.select()
    }
  }, [focusedFieldName])

  function renderField(field: EntityField) {
    const value =
      field.type === 'computed' && field.computeValue
        ? field.computeValue(values)
        : values[field.name]
    const inputValue = getInputValue(
      field,
      value,
      focusedFieldName === field.name,
    )
    const fieldId = `${config.path}-${field.name}-field`
    const fieldClassName =
      field.span === 'full' ? 'form-field form-field-full' : 'form-field'
    const isRequired = isFieldRequired(field, isCreate)
    const controlClassName =
      field.type === 'checkbox'
        ? 'field-control checkbox-control'
        : field.prefix || field.suffix
        ? 'field-control field-control-adorned'
        : 'field-control'
    const isMoneyField = field.valueFormat === 'money'
    const fieldRules = isRequired
      ? [{ message: `${field.label} is required.`, required: true }]
      : undefined
    const selectControlId =
      field.type === 'select' ? `${fieldId}-ant-select` : fieldId
    const isRequiredSelectInvalid =
      field.type === 'select' && isRequired && submitAttempted && inputValue === ''

    if (field.type === 'imagePreview') {
      const imageUrl = getPreviewValue(values, field.previewSourceField)
      const previewName = getPreviewValue(values, field.previewAltField)
      const altText = `${previewName || config.singularTitle} image preview`

      return (
        <div className="form-field image-preview-field" key={field.name}>
          <Typography.Text className="field-label-row" strong>
            {field.label}
          </Typography.Text>
          <ImageUrlPreview altText={altText} imageUrl={imageUrl} />
        </div>
      )
    }

    return (
      <Form.Item
        className={fieldClassName}
        extra={
          isRequired ? (
            <Space orientation="vertical" size={2}>
              <span aria-hidden="true" className="field-required">
                Required
              </span>
              {isRequiredSelectInvalid ? (
                <Typography.Text type="danger">
                  {field.label} is required.
                </Typography.Text>
              ) : null}
            </Space>
          ) : undefined
        }
        help={
          isRequiredSelectInvalid ? `${field.label} is required.` : undefined
        }
        htmlFor={selectControlId}
        key={field.name}
        label={field.label}
        required={isRequired}
        rules={fieldRules}
        validateStatus={isRequiredSelectInvalid ? 'error' : undefined}
      >
        <Space.Compact className={controlClassName}>
          {field.prefix ? (
            <Typography.Text className="field-adornment">
              {field.prefix}
            </Typography.Text>
          ) : null}
          {field.type === 'computed' ? (
            <Input
              id={fieldId}
              inputMode={isMoneyField ? 'decimal' : undefined}
              readOnly
              type="text"
              value={inputValue}
            />
          ) : field.type === 'textarea' ? (
            <Input.TextArea
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.value)}
              required={isRequired}
              rows={4}
              value={inputValue}
            />
          ) : field.type === 'checkbox' ? (
            <Checkbox
              checked={getCheckboxValue(value)}
              id={fieldId}
              onChange={(event) => onChange(field.name, event.target.checked)}
            />
          ) : field.type === 'select' ? (
            <Select
              aria-label={field.label}
              aria-required={isRequired}
              id={selectControlId}
              onChange={(nextValue) => onChange(field.name, nextValue ?? '')}
              options={field.options ?? []}
              placeholder="Select..."
              status={isRequiredSelectInvalid ? 'error' : undefined}
              value={inputValue || undefined}
            />
          ) : isMoneyField ? (
            <Input
              id={fieldId}
              inputMode="decimal"
              max={field.max}
              min={field.min}
              onBlur={() => {
                setFocusedFieldName((currentFieldName) =>
                  currentFieldName === field.name ? null : currentFieldName,
                )
              }}
              onChange={(event) => onChange(field.name, event.target.value)}
              onFocus={() => setFocusedFieldName(field.name)}
              required={isRequired}
              ref={(input) => {
                moneyInputRefs.current[field.name] = input?.input ?? null
              }}
              type="text"
              value={inputValue}
            />
          ) : field.type === 'number' ? (
            <InputNumber
              id={fieldId}
              max={field.max}
              min={field.min}
              onChange={(nextValue) =>
                onChange(field.name, nextValue === null ? '' : String(nextValue))
              }
              ref={(inputNumber) => {
                const inputElement =
                  inputNumber?.nativeElement?.querySelector('input')

                if (field.min !== undefined) {
                  inputElement?.setAttribute('min', String(field.min))
                }

                if (field.max !== undefined) {
                  inputElement?.setAttribute('max', String(field.max))
                }
              }}
              step={field.step ?? 'any'}
              value={inputValue === '' ? null : Number(inputValue)}
            />
          ) : (
            <Input
              id={fieldId}
              max={field.max}
              min={field.min}
              onChange={(event) => onChange(field.name, event.target.value)}
              required={isRequired}
              step={field.step ?? 'any'}
              type={field.type}
              value={inputValue}
            />
          )}
          {field.suffix ? (
            <Typography.Text className="field-adornment">
              {field.suffix}
            </Typography.Text>
          ) : null}
        </Space.Compact>
      </Form.Item>
    )
  }

  function handleFinish() {
    setSubmitAttempted(true)

    const hasMissingRequiredSelect = config.fields.some(
      (field) =>
        field.type === 'select' &&
        isFieldRequired(field, isCreate) &&
        getInputValue(field, values[field.name]) === '',
    )

    if (hasMissingRequiredSelect) {
      return
    }

    onSubmit()
  }

  return (
    <Form
      className={
        config.formLayout === 'compact'
          ? 'entity-form entity-form-compact'
          : 'entity-form'
      }
      layout="vertical"
      onFinish={handleFinish}
    >
      {errorMessage ? (
        <Alert
          className="form-error"
          message={errorMessage}
          role="alert"
          showIcon
          type="error"
        />
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

      {children}

      <div className="form-actions">
        <Button
          className="primary-action"
          disabled={isSaving}
          htmlType="submit"
          loading={isSaving}
          type="primary"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Form>
  )
}
