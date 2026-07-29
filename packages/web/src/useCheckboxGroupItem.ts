import type { ChangeEvent } from 'react'
import {
  FieldBinding,
  FormValues,
  StringArrayFieldPath,
  useField,
} from 'react-fatless-form'

/**
 * Props for a single checkbox within a checkbox group - a set of checkboxes
 * that all contribute to one `string[]`-typed form field. Returned by
 * {@link useCheckboxGroupItem} / {@link adaptCheckboxGroupItem}.
 *
 * **This is not the same as {@link useCheckboxField}**, which binds a single
 * `boolean` field to a single checkbox. `useCheckboxGroupItem` is for the
 * "select all that apply" pattern where multiple checkboxes share one form
 * field whose value is the array of selected option strings.
 *
 * Unlike sibling `Web*FieldProps` types, this one isn't parameterized by
 * `TField` - `checked`/`onChange` are always `boolean`/an event handler
 * regardless of which field or item they're bound to, so there's nothing
 * for a field-path type parameter to do here.
 *
 * @typeParam TValues - Your form's values shape.
 */
export interface WebCheckboxGroupItemProps {
  /** Whether this specific item's value is currently in the group's array. */
  checked: boolean
  /** Wire to `<input type="checkbox" onChange={onChange} />`. Toggles this item in/out of the array. */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Pure adapter from a raw {@link FieldBinding} to {@link WebCheckboxGroupItemProps}
 * for one specific item value.
 *
 * @param field - The raw field binding for the `string[]`-typed group field.
 * @param itemValue - The string value this particular checkbox represents.
 */
export function adaptCheckboxGroupItem<
  TValues extends FormValues,
  TField extends StringArrayFieldPath<TValues>,
>(
  field: FieldBinding<TValues, TField>,
  itemValue: string,
): WebCheckboxGroupItemProps {
  // Same conditional-type limitation as in useMultiSelectField / useFileField:
  // TypeScript can't reduce FieldValue<TValues, TField> to readonly string[]
  // in a generic body even though StringArrayFieldPath guarantees it.
  const current = Array.isArray(field.value)
    ? (field.value as readonly string[])
    : []

  return {
    checked: current.includes(itemValue),
    onChange: () => {
      const next = current.includes(itemValue)
        ? current.filter((v) => v !== itemValue)
        : [...current, itemValue]
      // `next` is `string[]`. `string[]` extends `readonly string[]` which is
      // in `PlatformFieldValue`, so this is assignable without a cast.
      field.setValue(next)
      if (!field.touched) {
        field.setTouched(true)
      }
    },
  }
}

/**
 * Binds a single checkbox to one item within a `string[]`-typed checkbox group.
 *
 * A checkbox group is a set of checkboxes that all contribute to one form
 * field, where each checkbox represents one possible string value. Checking or
 * unchecking a box adds or removes that string from the array.
 *
 * Declare the shared field as `string[]` in your form interface:
 *
 * ```ts
 * interface PreferencesValues {
 *   channels: string[]   // shared by all three checkboxes below
 * }
 * ```
 *
 * Then render one `useCheckboxGroupItem` call per checkbox, all pointing at
 * the same field name but each with their own `itemValue`:
 *
 * @example
 * ```tsx
 * function ChannelPreferences() {
 *   const email = useCheckboxGroupItem<PreferencesValues>('channels', 'email')
 *   const sms   = useCheckboxGroupItem<PreferencesValues>('channels', 'sms')
 *   const push  = useCheckboxGroupItem<PreferencesValues>('channels', 'push')
 *
 *   return (
 *     <fieldset>
 *       <label>
 *         <input type="checkbox" checked={email.checked} onChange={email.onChange} />
 *         Email
 *       </label>
 *       <label>
 *         <input type="checkbox" checked={sms.checked} onChange={sms.onChange} />
 *         SMS
 *       </label>
 *       <label>
 *         <input type="checkbox" checked={push.checked} onChange={push.onChange} />
 *         Push
 *       </label>
 *     </fieldset>
 *   )
 * }
 * ```
 *
 * @param name - The `string[]`-typed form field all checkboxes in the group share.
 * @param itemValue - The string this specific checkbox represents in the array.
 */
export function useCheckboxGroupItem<
  TValues extends FormValues = FormValues,
  TField extends StringArrayFieldPath<TValues> = StringArrayFieldPath<TValues>,
>(name: TField, itemValue: string): WebCheckboxGroupItemProps {
  return adaptCheckboxGroupItem(useField<TValues, TField>(name), itemValue)
}
