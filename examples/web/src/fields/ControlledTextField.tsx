import { TextField, TextFieldProps } from '@mui/material'
import { useTextField, FormValues, StringFieldPath } from 'react-fatless-form-web'

// Omit the props this component owns via the form context.
export interface ControlledTextFieldProps<
  TValues extends FormValues,
  TField extends StringFieldPath<TValues>,
> extends Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'onFocus' | 'error' | 'helperText' | 'slotProps'> {
  name: TField
}

/**
 * A string-valued field wired to MUI's `TextField`. `TField` defaults to
 * every string-valued path on `TValues` and narrows automatically from
 * whichever `name` you pass, so `<ControlledTextField<SignupValues> name="email" />`
 * is enough - no second type argument needed.
 *
 * Uses `slotProps.htmlInput.ref` (not the older `inputRef`) to reach the
 * actual `<input>` element for `form.setFocus(...)` support - `inputRef` is
 * soft-deprecated in current MUI in favor of the slotProps form.
 *
 * Note: for simplicity, this overwrites any `slotProps` the caller passes in
 * directly, rather than merging them. A component meant for wider reuse
 * would merge slot props instead of clobbering them.
 */
export default function ControlledTextField<
  TValues extends FormValues,
  TField extends StringFieldPath<TValues> = StringFieldPath<TValues>,
>({ name, ...props }: ControlledTextFieldProps<TValues, TField>) {
  const { value, onChange, onBlur, onFocus, touched, error, ref } = useTextField<
    TValues,
    TField
  >(name)
  const hasError = Boolean(touched && error)

  return (
    <TextField
      {...props}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      error={hasError}
      helperText={hasError ? error : undefined}
      slotProps={{ 
        htmlInput: { ref }, 
        formHelperText: { sx: { marginLeft: 0 } } }}
    />
  )
}
