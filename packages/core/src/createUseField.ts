import { useCallback } from 'react'

import { useFormContext } from './FormProvider'
import {
  FieldPath,
  FieldValue,
  Focusable,
  FormValues,
  PlatformFieldValue,
  UseFormReturn,
} from './types'
import { get } from './utils'

/**
 * Everything a single input needs to render and update one field: the
 * current value, its error/touched/dirty state, and the handlers to wire
 * into whatever input component you're using. Returned by {@link useField}
 * (or a hook built with {@link createUseField}).
 *
 * @example
 * ```tsx
 * function EmailField() {
 *   const { value, error, touched, setValue, onBlur } = useField<SignupValues>('email')
 *   return (
 *     <>
 *       <input
 *         value={value ?? ''}
 *         onChange={(e) => setValue(e.target.value)}
 *         onBlur={onBlur}
 *       />
 *       {touched && error && <span>{error}</span>}
 *     </>
 *   )
 * }
 * ```
 */
export interface FieldBinding<
  TValues extends FormValues,
  TField extends FieldPath<TValues>,
> {
  /** The field's path, echoed back for convenience (e.g. as a React `key`). */
  name: TField
  /**
   * The field's current value. Possibly `undefined` even for fields whose
   * type doesn't otherwise include `undefined` - a deep array path (e.g.
   * `'items.5.name'`) can point past the end of the actual array at
   * runtime. Most input bindings do `value ?? ''` (or an equivalent
   * fallback) when wiring this to a controlled input.
   */
  value: FieldValue<TValues, TField> | undefined
  /** The field's current validation error message, if any. */
  error: string | undefined
  /** Whether the field has been touched. See {@link FormTouched}. */
  touched: boolean | undefined
  /**
   * Whether the field's current value differs from its initial value. See
   * {@link FormDirty}. Useful for styling modified inputs, or deciding
   * whether a specific field alone should trigger a save action.
   */
  dirty: boolean | undefined
  /**
   * Updates the field's value. Accepts the field's real type or a raw
   * {@link PlatformFieldValue} straight from a UI event.
   */
  setValue: (
    nextValue: FieldValue<TValues, TField> | PlatformFieldValue,
  ) => void
  /** Sets the field's touched state directly. */
  setTouched: (nextTouched: boolean) => void
  /** Marks the field touched if it isn't already. Wire this to your input's `onBlur`. */
  onBlur: () => void
  /**
   * Intentionally a no-op. `touched` means "the user has left this field
   * at least once," which is what most UIs use to decide when to start
   * showing a validation error - wiring this to `touched` too would mark
   * fields touched the instant they're focused, before the user has had
   * any chance to interact with them. Kept here so every input has a
   * stable `onFocus` to wire up, in case you want to attach your own
   * behavior later.
   */
  onFocus: () => void
  /**
   * Ref callback that registers this field's underlying input so
   * {@link UseFormReturn.setFocus} can later find and focus it. Wire it
   * straight to whatever you're rendering - `<input ref={ref} />`,
   * `<TextInput ref={ref} />` - regardless of platform: anything with a
   * `.focus()` method satisfies {@link Focusable}, so the same ref works for
   * a DOM element or a React Native component instance with no adapter
   * needed on either side.
   */
  ref: (instance: Focusable | null) => void
}

function useFieldBinding<
  TValues extends FormValues,
  TField extends FieldPath<TValues>,
>(
  form: UseFormReturn<TValues>,
  name: TField,
): FieldBinding<TValues, TField> {
  const value = get(form.values, name)
  const error = form.errors[name]
  const touched = form.touched[name]
  const dirty = form.dirty[name]

  const setValue = useCallback(
    (nextValue: FieldValue<TValues, TField> | PlatformFieldValue) => {
      form.setFieldValue(name, nextValue)
    },
    [form, name],
  )

  const setTouched = useCallback(
    (nextTouched: boolean) => {
      form.setFieldTouched(name, nextTouched)
    },
    [form, name],
  )

  const onBlur = useCallback(() => {
    if (!touched) {
      form.setFieldTouched(name, true)
    }
  }, [form, name, touched])

  const onFocus = useCallback(() => {}, [])

  const ref = useCallback(
    (instance: Focusable | null) => {
      form.registerFieldRef(name, instance)
    },
    [form, name],
  )

  return { name, value, error, touched, dirty, setValue, setTouched, onBlur, onFocus, ref }
}

/**
 * Binds a single field from the package's default form context (the same
 * one `FormProvider`/`useFormContext` from the package root use) to its
 * current value, error, and update handlers.
 *
 * @typeParam TValues - Your form's value type. Required to get real types back - without
 * it, `name` and `value` fall back to the untyped default context.
 * @typeParam TField - The specific field path. Usually left to be inferred from `name`;
 * give it an explicit, narrower constraint in a wrapper component (e.g.
 * {@link StringFieldPath}) to get a fully-typed `value` with no cast required.
 *
 * @example
 * ```ts
 * const { value, error, touched, setValue, onBlur } = useField<SignupValues>('address.street')
 * ```
 */
export function useField<
  TValues extends FormValues = FormValues,
  TField extends FieldPath<TValues> = FieldPath<TValues>,
>(name: TField): FieldBinding<TValues, TField> {
  const form = useFormContext<TValues>()
  return useFieldBinding<TValues, TField>(form, name)
}

/**
 * Builds a `useField`-equivalent hook bound to a specific form context,
 * instead of the package's default one. Pair with the `useFormContext` (or
 * `useFormProvider`) returned by {@link createFormContext} for a
 * dedicated, independent form context.
 *
 * @example
 * ```ts
 * const { useFormContext: useCheckoutFormContext } = createFormContext<CheckoutValues>()
 * const useCheckoutField = createUseField(useCheckoutFormContext)
 *
 * function CardNumberField() {
 *   const { value, setValue } = useCheckoutField('cardNumber')
 *   // ...
 * }
 * ```
 */
export function createUseField<TValues extends FormValues>(
  useFormProvider: () => UseFormReturn<TValues>,
) {
  return function useTypedField<TField extends FieldPath<TValues>>(
    name: TField,
  ): FieldBinding<TValues, TField> {
    const form = useFormProvider()
    return useFieldBinding<TValues, TField>(form, name)
  }
}
