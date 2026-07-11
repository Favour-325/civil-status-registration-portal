import { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FormInputProps {
  label: string
  id: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

export function FormInput({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  error,
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 ${
          error
            ? 'border-destructive bg-destructive/5'
            : 'border-border bg-input hover:border-primary'
        }`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface FormSelectProps {
  label: string
  id: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

export function FormSelect({
  label,
  id,
  options,
  value,
  onChange,
  required,
  error,
}: FormSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer bg-input ${
            error
              ? 'border-destructive'
              : 'border-border hover:border-primary'
          }`}
        >
          <option value="">Select {label.toLowerCase()}...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface FormCheckboxProps {
  id: string
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}

export function FormCheckbox({
  id,
  label,
  checked,
  onChange,
  error,
}: FormCheckboxProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`h-5 w-5 rounded border transition-colors cursor-pointer accent-primary ${
            error ? 'border-destructive' : 'border-border'
          }`}
        />
        <label htmlFor={id} className="text-sm text-foreground cursor-pointer">
          {label}
        </label>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface FormRadioGroupProps {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

export function FormRadioGroup({
  label,
  options,
  value,
  onChange,
  required,
  error,
}: FormRadioGroupProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-3">
            <input
              type="radio"
              id={`${label}-${opt.value}`}
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            <label
              htmlFor={`${label}-${opt.value}`}
              className="text-sm text-foreground cursor-pointer"
            >
              {opt.label}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface FormDatePickerProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  maxDate?: string
}

export function FormDatePicker({
  label,
  id,
  value,
  onChange,
  required,
  error,
  maxDate,
}: FormDatePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={maxDate}
        className={`rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 ${
          error
            ? 'border-destructive bg-destructive/5'
            : 'border-border bg-input hover:border-primary'
        }`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
