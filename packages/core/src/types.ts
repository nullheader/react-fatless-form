import type { ReactElement, ReactNode } from 'react'

/**
 * Lifecycle status of a form's most recent submission attempt.
 *
 * - `'idle'` - no submission has been attempted yet, or the form was just reset.
 * - `'submitting'` - `onSubmit` is currently running.
 * - `'success'` - the last submission resolved without throwing.
 * - `'error'` - the last submission threw, or its promise rejected.
 *
 * Read it off `useForm(...).submissionStatus`, e.g. to disable a submit
 * button while `submissionStatus === 'submitting'`.
 */
export type FormSubmissionStatus = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Base constraint every form's value shape must satisfy. You will not write
 * `FormValues` yourself in normal usage - define your own `interface` (or
 * `type`) describing your form's fields, and pass it as `TValues` wherever a
 * hook or helper in this package asks for one.
 *
 * @example
 * ```ts
 * interface SignupValues {
 *   email: string
 *   password: string
 *   address: { street: string; city: string }
 * }
 *
 * const form = useForm<SignupValues>({
 *   email: '',
 *   password: '',
 *   address: { street: '', city: '' },
 * })
 * ```
 */
// `any`-valued index signature is what lets plain `interface` declarations
// (not just `type` aliases) satisfy `TValues extends FormValues` everywhere
// below. `Record<string, unknown>` looks safer but silently rejects every
// interface a consumer is likely to write for their form's value shape:
// TypeScript only recognizes an implicit index signature on object-literal
// *types*, never on `interface` declarations, and `any` is the one index
// signature value type exempted from that check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
export type FormValues = Record<string, any>

/**
 * Validation error messages for a form, keyed by field path. Every key is a
 * {@link FieldPath} into `TValues`, so nested fields are addressed the same
 * way they are everywhere else in this package: `'address.street'`,
 * `'tags.0'`, etc. A field with no error simply has no key.
 */
export type FormErrors<TValues extends FormValues> = Partial<
  Record<FieldPath<TValues>, string>
>

/**
 * Which fields the user has interacted with, keyed by field path (see
 * {@link FieldPath}). A field that isn't a key here hasn't been touched yet.
 * The built-in `useField`/`onBlur` binding sets this automatically; most
 * consumers never need to set it by hand.
 */
export type FormTouched<TValues extends FormValues> = Partial<
  Record<FieldPath<TValues>, boolean>
>

// Leaf types that FieldPath/FieldValue should never recurse into, even
// though they're technically objects. Without this, e.g. `dateOfBirth: Date`
// would expand into nonsense paths like 'dateOfBirth.getFullYear'.
type Primitive =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint
  | Date
  | File
  | Blob
  | RegExp
  | Map<unknown, unknown>
  | Set<unknown>

// Tuple-indexed decrement: TypeScript has no native arithmetic on type-level
// numbers, so "Prev[8]" walking down to 0 is the standard trick for capping
// recursion depth. Without this, FieldPath blows up with "Type ... circularly
// references itself in mapped type" on any self-referential shape (comment
// threads, category trees, org charts, anything with `children: Self[]`) -
// recursion needs an explicit floor, since TS can't tell on its own that a
// type only *looks* infinite and won't actually be walked forever.
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * Every valid dot-notated path into a value of type `T`, up to `Depth`
 * levels deep (default 8 - plenty for realistic forms; pass a smaller
 * number only if you need to deliberately truncate a very large or
 * self-referential type).
 *
 * - Plain fields are just their key: `'email'`.
 * - Nested objects use a dot: `'address.street'`.
 * - Arrays are indexed with a dot too, not brackets: `'tags.0'`,
 *   `'items.0.name'`. (Note: this differs from yup's own bracket notation,
 *   `items[0].name` - see {@link FormErrors} / `yupResolver`, which already
 *   normalizes that for you.)
 * - `Date`, `File`, `Blob`, `RegExp`, `Map`, `Set`, and all primitives are
 *   treated as leaves, never recursed into.
 *
 * For the default, untyped `FormValues` this simply collapses to `string`,
 * matching its "I don't know your shape yet" purpose.
 *
 * @typeParam T - The values shape to compute paths for.
 * @typeParam Depth - Internal recursion budget. Leave this alone.
 *
 * @example
 * ```ts
 * interface SignupValues {
 *   email: string
 *   tags: string[]
 *   address: { street: string; city: string }
 * }
 *
 * type Paths = FieldPath<SignupValues>
 * // 'email' | 'tags.0' | 'address' | 'address.street' | 'address.city'
 * ```
 */
export type FieldPath<T, Depth extends number = 8> = Depth extends 0
  ? never
  : T extends Primitive
    ? never
    : T extends readonly (infer V)[]
      ? `${number}` | `${number}.${FieldPath<V, Prev[Depth]>}`
      : {
          [K in keyof T & string]: T[K] extends Primitive
            ? K
            : K | `${K}.${FieldPath<T[K], Prev[Depth]>}`
        }[keyof T & string]

/**
 * Resolves the value type found at a given {@link FieldPath} `P` inside `T`.
 * This is what gives `useField('address.street')` a `string`-typed `value`
 * instead of `unknown` - you will rarely write `FieldValue` yourself, it's
 * mostly inferred for you wherever a `TField` is involved.
 *
 * @typeParam T - The values shape to resolve within.
 * @typeParam P - A path string, typically a {@link FieldPath}.
 *
 * @example
 * ```ts
 * interface SignupValues {
 *   address: { street: string }
 * }
 *
 * type Street = FieldValue<SignupValues, 'address.street'> // string
 * ```
 */
export type FieldValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? FieldValue<T[K], Rest>
      : K extends `${number}`
        ? T extends readonly (infer V)[]
          ? FieldValue<V, Rest>
          : never
        : never
    : P extends `${number}`
      ? T extends readonly (infer V)[]
        ? V
        : never
      : never

/**
 * Every {@link FieldPath} of `TValues` whose value is a `boolean` (or
 * `undefined`). Use this to constrain a checkbox/switch-style input
 * component's own `TField` parameter, so its body can treat the field's
 * value as a real `boolean` with no cast - the same way `useField`'s
 * `value` only becomes provably `string` for `TextInput` once `TField` is
 * constrained to {@link StringFieldPath} rather than the full `FieldPath`.
 *
 * @example
 * ```ts
 * function Checkbox<TValues extends FormValues, TField extends BooleanFieldPath<TValues>>(
 *   props: { name: TField },
 * ) {
 *   const { value, setValue } = useField<TValues, TField>(props.name)
 *   // `value` is `boolean | undefined` here, not a mixed union - no cast needed.
 * }
 * ```
 */
export type BooleanFieldPath<TValues extends FormValues> = {
  [Key in FieldPath<TValues>]: FieldValue<TValues, Key> extends
    | boolean
    | undefined
    ? Key
    : never
}[FieldPath<TValues>]

/**
 * Every {@link FieldPath} of `TValues` whose value is a `string` (or
 * `undefined`). The string-typed sibling of {@link BooleanFieldPath} - use
 * it to constrain a text-input-style component's `TField` parameter so its
 * `value` is provably a `string`, with no cast.
 *
 * @example
 * ```ts
 * function TextInput<TValues extends FormValues, TField extends StringFieldPath<TValues>>(
 *   props: { name: TField },
 * ) {
 *   const { value } = useField<TValues, TField>(props.name)
 *   const safe: string = value ?? '' // no cast required
 * }
 * ```
 */
export type StringFieldPath<TValues extends FormValues> = {
  [Key in FieldPath<TValues>]: FieldValue<TValues, Key> extends
    | string
    | undefined
    ? Key
    : never
}[FieldPath<TValues>]

/**
 * Every {@link FieldPath} of `TValues` whose value is a `number` (or
 * `undefined`). The numeric sibling of {@link StringFieldPath} /
 * {@link BooleanFieldPath} - use it for slider/stepper/numeric-input-style
 * components.
 */
export type NumberFieldPath<TValues extends FormValues> = {
  [Key in FieldPath<TValues>]: FieldValue<TValues, Key> extends
    | number
    | undefined
    ? Key
    : never
}[FieldPath<TValues>]

/**
 * Constrains `TField` to paths whose value type is `readonly string[]`,
 * `string[]`, or those types combined with `null`/`undefined`. Used by
 * multi-select and checkbox-group hooks - wherever the form field holds an
 * ordered collection of string values rather than a single string.
 *
 * @example
 * ```ts
 * interface FormValues {
 *   countries: string[]       // StringArrayFieldPath - included
 *   preferences: string[]     // StringArrayFieldPath - included
 *   email: string             // StringFieldPath only - excluded
 *   age: number               // NumberFieldPath only - excluded
 * }
 * ```
 */
export type StringArrayFieldPath<TValues extends FormValues> = {
  [Key in FieldPath<TValues>]: FieldValue<TValues, Key> extends
    | readonly string[]
    | null
    | undefined
    ? Key
    : never
}[FieldPath<TValues>]

/**
 * Raw primitive shapes a platform UI control can hand back before any
 * schema-specific coercion has happened - e.g. a plain `<input>` always
 * reports `string`, even for a field whose real value type is `number`.
 *
 * `setFieldValue`/`FieldBinding.setValue` accept `FieldValue<TValues,
 * TField> | PlatformFieldValue` specifically so you can wire
 * `onChangeText={setValue}` directly to a UI control without writing a
 * coercion wrapper for every field. This is the one place this package
 * deliberately loosens field-level typing - validate/coerce in your
 * resolver if a field's "real" type isn't a string.
 */
export type PlatformFieldValue =
  | string
  | number
  | boolean
  | null
  | readonly string[]
  | readonly number[]

/**
 * The array type stored at `TField`, if `TField` does in fact point at an
 * array - otherwise `never`. This is the parameter type for
 * `setFieldArrayValue`, which replaces a whole array field at once (e.g.
 * after a drag-and-drop reorder), as opposed to `setFieldValue`, which
 * targets one path at a time.
 *
 * @example
 * ```ts
 * interface SignupValues { tags: string[] }
 * type Tags = ArrayFieldValue<SignupValues, 'tags'> // readonly string[]
 * ```
 */
export type ArrayFieldValue<
  TValues extends FormValues,
  TField extends FieldPath<TValues>,
> =
  FieldValue<TValues, TField> extends readonly (infer Element)[]
    ? readonly Element[]
    : never

/**
 * The minimal shape core needs to programmatically focus a field's underlying
 * input, regardless of platform. A real DOM `HTMLInputElement` satisfies this
 * (it has `.focus()`), and so does a React Native `TextInput` instance - core
 * never needs to know which one it's actually holding.
 *
 * You won't normally reference this type directly; it shows up as the
 * parameter type of {@link FieldBinding.ref} for typing purposes.
 */
export interface Focusable {
  focus(): void
}

/** The raw state a form is built from: its values, validation errors, and touched fields. */
export interface FormState<TValues extends FormValues> {
  values: TValues
  errors: FormErrors<TValues>
  touched: FormTouched<TValues>
}

/**
 * Everything `useForm` gives you back: the current {@link FormState} plus
 * every action to read or mutate it. This is also what `useFormContext<TValues>()`
 * and `useField`'s underlying form context resolve to.
 *
 * @example
 * ```ts
 * const form = useForm<SignupValues>({ email: '', password: '' })
 * form.setFieldValue('email', 'a@b.com')
 * await handleSubmit(form, yupResolver(schema), submit)
 * ```
 */
export interface UseFormReturn<
  TValues extends FormValues,
> extends FormState<TValues> {
  /** Current status of the most recent submission attempt. See {@link FormSubmissionStatus}. */
  submissionStatus: FormSubmissionStatus
  /**
   * Synchronous read of the current values, without subscribing the calling
   * component to re-renders. Prefer this over `form.values` inside
   * callbacks (e.g. a submit handler) where you want the latest values but
   * don't need the component to re-render when they change.
   */
  getValues: () => TValues
  /**
   * Sets a single field's value by path. Accepts either the field's real
   * value type or a raw {@link PlatformFieldValue} - this is what makes
   * `onChangeText={setValue}` work directly against a plain `<input>`.
   *
   * @example
   * ```ts
   * form.setFieldValue('address.street', '123 Main St')
   * ```
   */
  setFieldValue: <TField extends FieldPath<TValues>>(
    field: TField,
    value: FieldValue<TValues, TField> | PlatformFieldValue,
  ) => void
  /**
   * Merges several top-level fields at once in a single update, e.g. after
   * fetching a record to pre-fill a form. Note: this is shallow and only
   * accepts top-level keys of `TValues`, not deep {@link FieldPath}s - use
   * `setFieldValue` for a single nested field.
   */
  batchSetFieldValues: (values: Partial<TValues>) => void
  /**
   * Replaces an entire array field at once (e.g. after a reorder or bulk
   * edit). For setting one item within an array, use `setFieldValue` with
   * that item's own path instead (e.g. `'tags.0'`).
   */
  setFieldArrayValue: <TField extends FieldPath<TValues>>(
    field: TField,
    value: ArrayFieldValue<TValues, TField>,
  ) => void
  /** Sets a single field's error message directly, bypassing your validation resolver. */
  setFieldError: <TField extends FieldPath<TValues>>(
    field: TField,
    error: string,
  ) => void
  /**
   * Marks a single field as touched (or not). The built-in `useField`
   * binding's `onBlur` already calls this for you - you mainly need this
   * directly for things like "mark this field touched as soon as the form
   * loads" or custom touch-tracking logic.
   */
  setFieldTouched: <TField extends FieldPath<TValues>>(
    field: TField,
    touched: boolean,
  ) => void
  /**
   * Runs the given resolver against the current values and stores the
   * resulting {@link FormErrors}. Returns `true` if validation passed (no
   * errors), `false` otherwise. `handleSubmit` calls this for you - call it
   * directly only if you need to validate outside of a submit flow (e.g. a
   * "next" button in a multi-step form).
   *
   * @example
   * ```ts
   * const isValid = form.validate(yupResolver(schema))
   * ```
   */
  validate: (validateFn: ValidationResolver<TValues>) => boolean
  /** Resets values, errors, and touched state back to the initial values passed to `useForm`. */
  resetForm: () => void
  /** Sets {@link FormSubmissionStatus} directly. `handleSubmit` manages this for you in the normal flow. */
  updateSubmissionStatus: (status: FormSubmissionStatus) => void
  /** Shorthand for `updateSubmissionStatus('idle')`. */
  resetSubmissionStatus: () => void
  /**
   * Registers (or, called with `null`, unregisters) the focusable instance
   * backing a field, so {@link UseFormReturn.setFocus} can later find it.
   * `useField`'s binding already wires this up for you via {@link FieldBinding.ref} -
   * you'll only call this directly if you're building a field binding that
   * doesn't go through `useField` at all.
   */
  registerFieldRef: (field: FieldPath<TValues>, ref: Focusable | null) => void
  /**
   * Imperatively focuses a field by path - the headless equivalent of calling
   * `.focus()` on an input yourself, for cases like "jump to the next field
   * when the keyboard's return key is pressed" or "focus the first field with
   * a validation error after a failed submit." No-ops silently if the field
   * isn't currently mounted (e.g. it's on a different step of a multi-step
   * form) - same as calling `.focus()` on something that doesn't exist would
   * conceptually do, just without throwing.
   *
   * @example
   * ```tsx
   * <TextInput
   *   name="firstName"
   *   returnKeyType="next"
   *   onSubmitEditing={() => form.setFocus('lastName')}
   * />
   * ```
   */
  setFocus: (field: FieldPath<TValues>) => void
}

/**
 * A validation function: takes the current values, returns a
 * {@link FormErrors} object (empty means valid). `yupResolver(schema)`
 * produces one of these from a yup schema; write your own directly if
 * you're not using yup.
 *
 * @example
 * ```ts
 * const resolver: ValidationResolver<SignupValues> = (values) => {
 *   const errors: FormErrors<SignupValues> = {}
 *   if (!values.email.includes('@')) errors.email = 'Invalid email'
 *   return errors
 * }
 * ```
 */
export type ValidationResolver<TValues extends FormValues> = (
  values: TValues,
) => FormErrors<TValues>

/**
 * The bundle returned by `createFormContext<TValues>()`: a matched
 * `FormProvider`/`useFormContext`/`useFormProvider` trio backed by their own
 * dedicated React context, distinct from this package's default singleton
 * one. Reach for `createFormContext` (and thus this type) when you need more
 * than one independent form context alive at once - e.g. a wizard with a
 * nested sub-form - rather than sharing the default `FormProvider`/
 * `useFormContext` exported from the package root.
 *
 * Each of the three functions is itself generic and defaults to
 * `TDefaultValues`, so `useFormContext()` with no type argument resolves to
 * the type the context was created with, while `useFormContext<Other>()`
 * still works for one-off overrides.
 */
export interface FormContextApi<TDefaultValues extends FormValues> {
  FormProvider: <TValues extends FormValues = TDefaultValues>(props: {
    form: UseFormReturn<TValues>
    children: ReactNode
  }) => ReactElement
  useFormContext: <
    TValues extends FormValues = TDefaultValues,
  >() => UseFormReturn<TValues>
  useFormProvider: <
    TValues extends FormValues = TDefaultValues,
  >() => UseFormReturn<TValues>
}
