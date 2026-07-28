import { View } from 'react-native'
import { TextInput, HelperText, TextInputProps } from 'react-native-paper'
import { useTextField, FormValues, StringFieldPath } from 'react-fatless-form-native'

export interface ControlledTextInputProps<
  TValues extends FormValues,
  TField extends StringFieldPath<TValues>,
> extends Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'onFocus' | 'error' | 'ref'> {
  name: TField
}

/**
 * A string-valued field wired to react-native-paper's `TextInput`. `TField`
 * defaults to every string-valued path on `TValues` and narrows
 * automatically from whichever `name` you pass, so
 * `<ControlledTextInput<SignupValues> name="email" />` is enough - no second
 * type argument needed.
 *
 * Paper's `TextInput` forwards its ref to a handle exposing `.focus()` (same
 * as RN core's `TextInput`), so wiring `ref` here is what makes the field a
 * valid target for `form.setFocus(...)`.
 */
export default function ControlledTextInput<
  TValues extends FormValues,
  TField extends StringFieldPath<TValues> = StringFieldPath<TValues>,
>({ name, ...props }: ControlledTextInputProps<TValues, TField>) {
  const { value, onChangeText, onBlur, onFocus, touched, error, ref } = useTextField<
    TValues,
    TField
  >(name)
  const hasError = Boolean(touched && error)

  return (
    <View>
      <TextInput
        {...props}
        ref={ref}
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        onFocus={onFocus}
        error={hasError}
      />
      <HelperText type="error" visible={hasError}>
        {hasError ? error : ''}
      </HelperText>
    </View>
  )
}
