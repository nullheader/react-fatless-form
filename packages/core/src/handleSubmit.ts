import { FieldPath, FormValues, UseFormReturn, ValidationResolver } from './types'

/**
 * Options controlling what {@link handleSubmit} does after `onSubmit`
 * settles (or after validation fails).
 */
export interface HandleSubmitConfig<TResult> {
  /** Called after `onSubmit` resolves successfully, with its result. */
  onSuccess?: (result: TResult) => void
  /**
   * Called if `onSubmit` throws. Not called on a validation failure -
   * validation failures never reach `onSubmit` at all, they just mark the
   * invalid fields touched and return.
   */
  onError?: (error: unknown) => void
  /**
   * Whether (and how) to reset the form after a successful submit.
   *
   * - `true` (default): reset back to whatever values `useForm` was first
   *   called with - the right choice for a one-shot form (signup, a
   *   contact form) that should clear itself out after submitting.
   * - `'submitted'`: reset to the values that were just submitted instead
   *   of the original ones - they stay on screen, but the form becomes
   *   clean relative to them (`isDirty` goes back to `false`). This is
   *   the one you want for an edit-and-save form, typically paired with
   *   `getDirtyValues` for the PATCH body itself. Reaching for `true`
   *   here by mistake is exactly what makes a saved edit look like it
   *   silently reverted.
   * - `false`: don't reset anything - values, errors, touched, and dirty
   *   state are all left exactly as they were.
   */
  resetOnSuccess?: boolean | 'submitted'
}

/**
 * Wires up a complete submit flow: validates the form, marks invalid
 * fields touched if validation fails (so their errors are visible
 * immediately instead of only after the user blurs each one by hand), and
 * otherwise runs `onSubmit` - tracking {@link UseFormReturn.submissionStatus}
 * throughout and guarding against double-submits (calling this again while
 * already `'submitting'` is a no-op).
 *
 * @typeParam TValues - Your form's value type.
 * @typeParam TResult - Whatever `onSubmit` resolves to, passed through to `config.onSuccess`.
 *
 * @example
 * ```ts
 * function SignupForm() {
 *   const form = useForm<SignupValues>({ email: '', password: '' })
 *   const resolver = yupResolver(signupSchema)
 *
 *   const onPress = () =>
 *     handleSubmit(form, resolver, async (values) => {
 *       await api.signup(values)
 *     }, {
 *       onError: () => toast.error('Signup failed'),
 *     })
 *
 *   return (
 *     <FormProvider form={form}>
 *       <EmailField />
 *     </FormProvider>
 *   )
 * }
 * ```
 *
 * An edit form wants the opposite reset behavior - keep the saved values
 * on screen, don't wipe them back to whatever the form loaded with:
 *
 * @example
 * ```ts
 * function ProfileForm() {
 *   const { data } = useGetProfileQuery(userId) // e.g. RTK Query / React Query
 *   const [updateProfile] = useUpdateProfileMutation()
 *   const form = useForm<ProfileValues>(data)
 *
 *   const onPress = () =>
 *     handleSubmit(form, resolver, (values) => updateProfile(getDirtyValues(form)), {
 *       resetOnSuccess: 'submitted', // isDirty -> false; values stay as saved
 *     })
 *   // ...
 * }
 * ```
 *
 * Note that `data` refetching later (e.g. because the mutation invalidated
 * a cache tag) never touches the form on its own either way - `useForm`
 * only reads `initialValues` once, at mount. `resetOnSuccess: 'submitted'`
 * is what actually clears `isDirty` here, immediately, independent of
 * whenever that refetch happens to resolve.
 */
export async function handleSubmit<TValues extends FormValues, TResult = void>(
  form: UseFormReturn<TValues>,
  resolver: ValidationResolver<TValues>,
  onSubmit: (values: TValues) => Promise<TResult>,
  config: HandleSubmitConfig<TResult> = {},
): Promise<void> {
  const { validate, updateSubmissionStatus, resetForm, setFieldTouched } = form

  // Guard against double submits, e.g. a fast double-click before a
  // disabled state has propagated back to the submit button.
  if (form.submissionStatus === 'submitting') {
    return
  }

  if (!validate(resolver)) {
    // Touch every field that actually has an error, so it's visible
    // immediately rather than only after the user blurs it by hand. We
    // re-run the resolver (rather than e.g. Object.keys(form.values)) because
    // its error keys are already dot-paths matching FieldPath<TValues> -
    // Object.keys(form.values) would only see top-level keys and miss
    // anything nested, like 'address.street'.
    const errors = resolver(form.getValues())
    for (const field of Object.keys(errors) as FieldPath<TValues>[]) {
      setFieldTouched(field, true)
    }
    return
  }

  updateSubmissionStatus('submitting')

  try {
    const result = await onSubmit(form.values)
    updateSubmissionStatus('success')

    if (config.resetOnSuccess === 'submitted') {
      resetForm(form.values)
    } else if (config.resetOnSuccess !== false) {
      resetForm()
    }

    config.onSuccess?.(result)
  } catch (error) {
    updateSubmissionStatus('error')
    config.onError?.(error)
  }
}
