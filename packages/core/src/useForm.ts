import { useCallback, useMemo, useState, useRef } from 'react'

import { createFormState } from './state'
import {
  ArrayFieldValue,
  FieldPath,
  FieldValue,
  Focusable,
  FormDirty,
  FormState,
  FormSubmissionStatus,
  FormValues,
  PlatformFieldValue,
  UseFormReturn,
  ValidationResolver,
} from './types'
import { get, isEqual, set } from './utils'

/**
 * Creates and owns a form's state: values, errors, touched fields, dirty
 * fields, and submission status, plus every action to read or mutate them.
 * This is the starting point for using this package - pass the result to
 * {@link FormProvider} so descendant fields can reach it via
 * {@link useFormContext} / {@link useField}, and to {@link handleSubmit} to
 * wire up validation and submission.
 *
 * Every individual action returned (`setFieldValue`, `validate`,
 * `resetForm`, etc.) is documented on {@link UseFormReturn} - see there for
 * what each one does.
 *
 * @typeParam TValues - Your form's value shape.
 * @param initialValues - The form's starting values, read once when the
 * hook first mounts (the same way `useState`'s lazy initializer would be).
 * Passing a new object here on a later render - e.g. because it's sourced
 * from an RTK Query / React Query cache that just refetched - is a no-op;
 * the hook won't silently rebase a form a user might be mid-edit on top
 * of. Call `resetForm(newValues)` when you deliberately want to move the
 * baseline, e.g. after a successful save (see `handleSubmit`'s
 * `resetOnSuccess: 'submitted'`, which does exactly this for you).
 *
 * @example
 * ```tsx
 * function SignupForm() {
 *   const form = useForm<SignupValues>({ email: '', password: '' })
 *   return (
 *     <FormProvider form={form}>
 *       <EmailField />
 *     </FormProvider>
 *   )
 * }
 * ```
 */
export function useForm<TValues extends FormValues>(
  initialValues: TValues,
): UseFormReturn<TValues> {
  const [state, setState] = useState(() => createFormState(initialValues))
  const [submissionStatus, setSubmissionStatus] =
    useState<FormSubmissionStatus>('idle')

  // Maintain a synchronous ref for immediate access without stale closures
  const valuesRef = useRef<TValues>(initialValues)

  // The baseline dirty-tracking compares against. Starts as the values the
  // hook was first called with, same as `valuesRef` - but unlike
  // `initialValues` itself (the hook's *own* parameter, only ever read on
  // the very first render, exactly like useState's lazy initializer and
  // useRef's initial value both already are), this ref is what lets
  // `resetForm(newValues)` move the baseline forward later without
  // depending on `initialValues` changing identity at all. That
  // decoupling matters: a parent re-rendering with a new `initialValues`
  // reference - e.g. an RTK Query / React Query cache update after an
  // unrelated refetch - must never silently rebase a form out from under
  // a user who's mid-edit. The only way to move this baseline is the
  // explicit call below.
  const initialValuesRef = useRef<TValues>(initialValues)

  const getValues = useCallback(() => valuesRef.current, [])

  const setFieldValue = useCallback(
    <TField extends FieldPath<TValues>>(
      field: TField,
      value: FieldValue<TValues, TField> | PlatformFieldValue,
    ) => {
      valuesRef.current = set(valuesRef.current, field, value)
      const fieldIsDirty = !isEqual(value, get(initialValuesRef.current, field))

      setState((previous: FormState<TValues>) => ({
        ...previous,
        values: valuesRef.current,
        dirty: { ...previous.dirty, [field]: fieldIsDirty },
      }))
    },
    [],
  )

  const batchSetFieldValues = useCallback((values: Partial<TValues>) => {
    valuesRef.current = { ...valuesRef.current, ...values }

    setState((previous: FormState<TValues>) => {
      const nextDirty: FormDirty<TValues> = { ...previous.dirty }
      // `values` only ever carries top-level keys (see the doc comment on
      // `UseFormReturn.batchSetFieldValues`), and every top-level key of
      // TValues is itself a valid FieldPath - same reasoning as the cast
      // in handleSubmit.ts.
      for (const field of Object.keys(values) as FieldPath<TValues>[]) {
        nextDirty[field] = !isEqual(get(values, field), get(initialValuesRef.current, field))
      }

      return {
        ...previous,
        values: valuesRef.current,
        dirty: nextDirty,
      }
    })
  }, [])

  const setFieldArrayValue = useCallback(
    <TField extends FieldPath<TValues>>(
      field: TField,
      value: ArrayFieldValue<TValues, TField>,
    ) => {
      valuesRef.current = set(valuesRef.current, field, value)
      const fieldIsDirty = !isEqual(value, get(initialValuesRef.current, field))

      setState((previous: FormState<TValues>) => ({
        ...previous,
        values: valuesRef.current,
        dirty: { ...previous.dirty, [field]: fieldIsDirty },
      }))
    },
    [],
  )

  const setFieldError = useCallback(
    <TField extends FieldPath<TValues>>(field: TField, error: string) => {
      setState((previous: FormState<TValues>) => ({
        ...previous,
        errors: {
          ...previous.errors,
          [field]: error,
        },
      }))
    },
    [],
  )

  const setFieldTouched = useCallback(
    <TField extends FieldPath<TValues>>(field: TField, touched: boolean) => {
      setState((previous: FormState<TValues>) => ({
        ...previous,
        touched: {
          ...previous.touched,
          [field]: touched,
        },
      }))
    },
    [],
  )

  const validate = useCallback((validateFn: ValidationResolver<TValues>) => {
    const errors = validateFn(valuesRef.current)
    setState((previous: FormState<TValues>) => ({ ...previous, errors }))
    return Object.keys(errors).length === 0
  }, [])

  const resetForm = useCallback((newValues?: TValues) => {
    const nextValues = newValues ?? initialValuesRef.current
    initialValuesRef.current = nextValues
    valuesRef.current = nextValues
    setState(createFormState(nextValues))
  }, [])

  // Plain ref, not state: registering/unregistering a field's underlying
  // input is pure imperative bookkeeping that should never itself trigger a
  // re-render, the same way React's own ref system works.
  const fieldRefs = useRef<Partial<Record<FieldPath<TValues>, Focusable>>>({})

  const registerFieldRef = useCallback(
    (field: FieldPath<TValues>, ref: Focusable | null) => {
      if (ref === null) {
        delete fieldRefs.current[field]
      } else {
        fieldRefs.current[field] = ref
      }
    },
    [],
  )

  const setFocus = useCallback((field: FieldPath<TValues>) => {
    fieldRefs.current[field]?.focus()
  }, [])

  const updateSubmissionStatus = useCallback((status: FormSubmissionStatus) => {
    setSubmissionStatus(status)
  }, [])

  const resetSubmissionStatus = useCallback(() => {
    setSubmissionStatus('idle')
  }, [])

  return useMemo(() => {
    // Cheap on purpose: proportional to the number of fields ever set, not
    // to the size of the form's values - the whole point of tracking dirty
    // state incrementally in `state.dirty` rather than deep-comparing
    // `values` against `initialValues` here on every render.
    const isDirty = Object.values(state.dirty).some(Boolean)

    return {
      ...state,
      submissionStatus,
      isDirty,
      getValues,
      setFieldValue,
      batchSetFieldValues,
      setFieldArrayValue,
      setFieldError,
      setFieldTouched,
      validate,
      resetForm,
      updateSubmissionStatus,
      resetSubmissionStatus,
      registerFieldRef,
      setFocus,
    }
  }, [
    state,
    submissionStatus,
    getValues,
    setFieldValue,
    batchSetFieldValues,
    setFieldArrayValue,
    setFieldError,
    setFieldTouched,
    validate,
    resetForm,
    updateSubmissionStatus,
    resetSubmissionStatus,
    registerFieldRef,
    setFocus,
  ])
}
