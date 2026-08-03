import { act, renderHook } from '@testing-library/react'

import { handleSubmit } from '../src/handleSubmit'
import { useForm } from '../src/useForm'
import type { FormErrors, ValidationResolver } from '../src/types'

interface SignupValues {
  email: string
  password: string
}

const initialValues: SignupValues = { email: '', password: '' }

/** Always-valid resolver - lets tests focus on the submit/status half of the flow. */
const alwaysValid: ValidationResolver<SignupValues> = () => ({})

/** Requires both fields to be non-empty. */
const requireBoth: ValidationResolver<SignupValues> = (values) => {
  const errors: FormErrors<SignupValues> = {}
  if (!values.email) errors.email = 'Email is required'
  if (!values.password) errors.password = 'Password is required'
  return errors
}

function setupForm(values: SignupValues = initialValues) {
  return renderHook(() => useForm<SignupValues>(values))
}

/** A promise plus its resolve/reject, for manually controlling async timing in tests. */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('handleSubmit - validation failure', () => {
  it('never calls onSubmit', async () => {
    const { result: form } = setupForm()
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, requireBoth, onSubmit)
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('populates the form errors from the resolver', async () => {
    const { result: form } = setupForm()
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, requireBoth, onSubmit)
    })

    expect(form.current.errors).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    })
  })

  it('marks only the invalid fields as touched', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: '' })
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, requireBoth, onSubmit)
    })

    expect(form.current.touched).toEqual({ password: true })
  })

  it('leaves submissionStatus at idle - it never starts submitting', async () => {
    const { result: form } = setupForm()
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, requireBoth, onSubmit)
    })

    expect(form.current.submissionStatus).toBe('idle')
  })

  it('does not call onSuccess or onError', async () => {
    const { result: form } = setupForm()
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const onSuccess = jest.fn()
    const onError = jest.fn()

    await act(async () => {
      await handleSubmit(form.current, requireBoth, onSubmit, { onSuccess, onError })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})

describe('handleSubmit - successful submission', () => {
  it('calls onSubmit with the current form values', async () => {
    const values = { email: 'a@b.com', password: 'hunter2' }
    const { result: form } = setupForm(values)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(onSubmit).toHaveBeenCalledWith(values)
  })

  it('transitions submissionStatus to submitting while onSubmit is pending', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const deferred = createDeferred<void>()
    const onSubmit = jest.fn(() => deferred.promise)

    let pending!: Promise<void>
    act(() => {
      pending = handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(form.current.submissionStatus).toBe('submitting')

    await act(async () => {
      deferred.resolve()
      await pending
    })
  })

  it('transitions submissionStatus to success once onSubmit resolves', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(form.current.submissionStatus).toBe('success')
  })

  it('resets the form back to its initial values by default', async () => {
    const values = { email: 'a@b.com', password: 'hunter2' }
    const { result: form } = setupForm(values)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    // resetForm() resets to whatever THIS form instance was actually
    // constructed with (`values`) - not the shared `initialValues` constant
    // other tests in this file happen to use as their default.
    expect(form.current.values).toEqual(values)
  })

  it('default reset reverts to the ORIGINAL initial values, not the submitted ones, when they differ', async () => {
    // Distinct from the test above: here the form is actually edited away
    // from its initial values before submitting, so a default reset
    // (reverting to initialValues) and a 'submitted' reset (keeping the
    // submitted values) would produce two different, observable results -
    // this is what actually pins down which one `true` means.
    const { result: form } = setupForm(initialValues)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    act(() => {
      form.current.setFieldValue('email', 'edited@b.com')
    })
    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(form.current.values).toEqual(initialValues)
    expect(form.current.isDirty).toBe(false)
  })

  it('does not reset the form when resetOnSuccess is false', async () => {
    const values = { email: 'a@b.com', password: 'hunter2' }
    const { result: form } = setupForm(values)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { resetOnSuccess: false })
    })

    expect(form.current.values).toEqual(values)
  })

  it('resetOnSuccess: false leaves dirty state untouched too', async () => {
    const { result: form } = setupForm(initialValues)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    act(() => {
      form.current.setFieldValue('email', 'edited@b.com')
    })
    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { resetOnSuccess: false })
    })

    expect(form.current.isDirty).toBe(true)
  })

  it("resetOnSuccess: 'submitted' keeps the submitted values instead of reverting to initialValues", async () => {
    const { result: form } = setupForm(initialValues)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    act(() => {
      form.current.setFieldValue('email', 'saved@b.com')
    })
    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { resetOnSuccess: 'submitted' })
    })

    expect(form.current.values).toEqual({ ...initialValues, email: 'saved@b.com' })
  })

  it("resetOnSuccess: 'submitted' clears isDirty back to false", async () => {
    const { result: form } = setupForm(initialValues)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    act(() => {
      form.current.setFieldValue('email', 'saved@b.com')
    })
    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { resetOnSuccess: 'submitted' })
    })

    expect(form.current.dirty).toEqual({})
    expect(form.current.isDirty).toBe(false)
  })

  it("resetOnSuccess: 'submitted' establishes the submitted values as the baseline for future edits", async () => {
    const { result: form } = setupForm(initialValues)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    act(() => {
      form.current.setFieldValue('email', 'saved@b.com')
    })
    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { resetOnSuccess: 'submitted' })
    })
    act(() => {
      // Same value as the new (submitted) baseline - should be pristine.
      form.current.setFieldValue('email', 'saved@b.com')
    })

    expect(form.current.isDirty).toBe(false)
  })

  it('leaves submissionStatus as success even though the form itself was reset', async () => {
    const values = { email: 'a@b.com', password: 'hunter2' }
    const { result: form } = setupForm(values)
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    // resetForm() does not touch submissionStatus (see useForm.test.ts) -
    // confirming that holds through the full handleSubmit integration too.
    expect(form.current.submissionStatus).toBe('success')
    expect(form.current.values).toEqual(values)
  })

  it('calls onSuccess with the value onSubmit resolved to', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockResolvedValue({ userId: 42 })
    const onSuccess = jest.fn()

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { onSuccess })
    })

    expect(onSuccess).toHaveBeenCalledWith({ userId: 42 })
  })

  it('does not call onError on success', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const onError = jest.fn()

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { onError })
    })

    expect(onError).not.toHaveBeenCalled()
  })

  it('works with no config object at all', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      // handleSubmit returns Promise<void> - asserting it resolves to
      // undefined (rather than rejecting) confirms the omitted config
      // doesn't cause a crash trying to read config.resetOnSuccess/onSuccess/onError.
      await expect(handleSubmit(form.current, alwaysValid, onSubmit)).resolves.toBeUndefined()
    })
  })
})

describe('handleSubmit - failed submission', () => {
  it('transitions submissionStatus to error', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockRejectedValue(new Error('network down'))

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(form.current.submissionStatus).toBe('error')
  })

  it('does not reset the form', async () => {
    const values = { email: 'a@b.com', password: 'hunter2' }
    const { result: form } = setupForm(values)
    const onSubmit = jest.fn().mockRejectedValue(new Error('network down'))

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(form.current.values).toEqual(values)
  })

  it('calls onError with the thrown error', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const submitError = new Error('network down')
    const onSubmit = jest.fn().mockRejectedValue(submitError)
    const onError = jest.fn()

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { onError })
    })

    expect(onError).toHaveBeenCalledWith(submitError)
  })

  it('does not call onSuccess', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockRejectedValue(new Error('network down'))
    const onSuccess = jest.fn()

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { onSuccess })
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does not propagate the rejection out of handleSubmit itself', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockRejectedValue(new Error('network down'))

    await act(async () => {
      // handleSubmit's own try/catch means its returned promise resolves
      // (to undefined) even though onSubmit rejected internally.
      await expect(handleSubmit(form.current, alwaysValid, onSubmit)).resolves.toBeUndefined()
    })
  })

  it('also catches a synchronous throw from a non-async onSubmit', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const syncError = new Error('threw before returning a promise')
    // Deliberately not `async` - throws immediately instead of rejecting.
    const onSubmit = jest.fn(() => {
      throw syncError
    })
    const onError = jest.fn()

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit, { onError })
    })

    expect(form.current.submissionStatus).toBe('error')
    expect(onError).toHaveBeenCalledWith(syncError)
  })
})

describe('handleSubmit - double-submit guard', () => {
  it('ignores a second call while the first is still submitting', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const deferred = createDeferred<void>()
    const onSubmit = jest.fn(() => deferred.promise)

    let firstCall!: Promise<void>
    act(() => {
      firstCall = handleSubmit(form.current, alwaysValid, onSubmit)
    })
    expect(form.current.submissionStatus).toBe('submitting')

    // Second call while the first is still pending.
    let secondCall!: Promise<void>
    act(() => {
      secondCall = handleSubmit(form.current, alwaysValid, onSubmit)
    })

    await act(async () => {
      deferred.resolve()
      await Promise.all([firstCall, secondCall])
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('allows a new submission once the previous one has settled', async () => {
    const { result: form } = setupForm({ email: 'a@b.com', password: 'hunter2' })
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })
    // The first successful submit resets the form back to its initial
    // (empty) values. Re-populate before submitting again, mirroring a real
    // "edit again after a successful save" flow.
    act(() => {
      form.current.batchSetFieldValues({ email: 'a@b.com', password: 'hunter2' })
    })
    await act(async () => {
      await handleSubmit(form.current, alwaysValid, onSubmit)
    })

    expect(onSubmit).toHaveBeenCalledTimes(2)
  })
})
