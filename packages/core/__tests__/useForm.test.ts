import { act, renderHook } from '@testing-library/react'

import { useForm } from '../src/useForm'
import type { Focusable } from '../src/types'

interface SignupValues {
  email: string
  password: string
  remember: boolean
  age: number | null
  tags: string[]
  address: { street: string; city: string }
}

const initialValues: SignupValues = {
  email: '',
  password: '',
  remember: false,
  age: null,
  tags: [],
  address: { street: '', city: '' },
}

describe('useForm - initial state', () => {
  it('seeds values with exactly what was passed in', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.values).toEqual(initialValues)
  })

  it('starts with no errors', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.errors).toEqual({})
  })

  it('starts with no touched fields', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.touched).toEqual({})
  })

  it('starts with no dirty fields', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.dirty).toEqual({})
  })

  it('starts with isDirty false', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.isDirty).toBe(false)
  })

  it('starts with an idle submission status', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.submissionStatus).toBe('idle')
  })
})

describe('useForm - getValues', () => {
  it('synchronously returns the current values', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.getValues()).toEqual(initialValues)
  })

  it('reflects a value set moments earlier, with no stale closure', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.getValues().email).toBe('a@b.com')
  })
})

describe('useForm - setFieldValue', () => {
  it('sets a top-level field', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.values.email).toBe('a@b.com')
  })

  it('sets a nested field via a dot path', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('address.street', '123 Main St')
    })

    expect(result.current.values.address.street).toBe('123 Main St')
  })

  it('leaves sibling fields untouched', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.values.password).toBe('')
  })

  it('leaves sibling nested fields untouched', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('address.street', '123 Main St')
    })

    expect(result.current.values.address.city).toBe('')
  })

  it('produces a new values object identity, so consumers re-render', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const valuesBefore = result.current.values

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.values).not.toBe(valuesBefore)
  })

  it('accepts a raw array index path', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('tags.0', 'first-tag')
    })

    expect(result.current.values.tags).toEqual(['first-tag'])
  })

  it('marks a field dirty once its value differs from the initial value', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.dirty.email).toBe(true)
  })

  it('does not mark a field dirty when set to the same value it already had', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', initialValues.email)
    })

    expect(result.current.dirty.email).toBe(false)
  })

  it('un-marks a field dirty once its value is changed back to the initial value', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })
    act(() => {
      result.current.setFieldValue('email', initialValues.email)
    })

    expect(result.current.dirty.email).toBe(false)
  })

  it('tracks a nested field as dirty under its own dot path', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('address.street', '123 Main St')
    })

    expect(result.current.dirty['address.street']).toBe(true)
  })

  it('leaves sibling fields dirty state untouched', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.dirty.password).toBeUndefined()
  })
})

describe('useForm - batchSetFieldValues', () => {
  it('merges several top-level fields in one update', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.batchSetFieldValues({ email: 'a@b.com', password: 'hunter2' })
    })

    expect(result.current.values.email).toBe('a@b.com')
    expect(result.current.values.password).toBe('hunter2')
  })

  it('leaves fields not included in the partial update untouched', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.batchSetFieldValues({ email: 'a@b.com' })
    })

    expect(result.current.values.remember).toBe(false)
    expect(result.current.values.tags).toEqual([])
  })

  it('replaces a nested object field wholesale rather than deep-merging it', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('address.city', 'Nairobi')
    })
    act(() => {
      // A shallow top-level merge: passing a new `address` here should
      // replace the whole object, not merge with the previously-set city.
      result.current.batchSetFieldValues({ address: { street: '5th Ave', city: '' } })
    })

    expect(result.current.values.address).toEqual({ street: '5th Ave', city: '' })
  })

  it('marks only the keys included in the partial update as dirty', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.batchSetFieldValues({ email: 'a@b.com', password: 'hunter2' })
    })

    expect(result.current.dirty.email).toBe(true)
    expect(result.current.dirty.password).toBe(true)
    expect(result.current.dirty.remember).toBeUndefined()
  })

  it('does not mark a batched key dirty when its value matches the initial value', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.batchSetFieldValues({ email: initialValues.email })
    })

    expect(result.current.dirty.email).toBe(false)
  })

  it('accumulates dirty state across multiple batched updates rather than replacing it', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.batchSetFieldValues({ email: 'a@b.com' })
    })
    act(() => {
      result.current.batchSetFieldValues({ password: 'hunter2' })
    })

    expect(result.current.dirty).toEqual({ email: true, password: true })
  })
})

describe('useForm - setFieldArrayValue', () => {
  it('replaces an entire array field at once', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldArrayValue('tags', ['a', 'b', 'c'])
    })

    expect(result.current.values.tags).toEqual(['a', 'b', 'c'])
  })

  it('leaves other fields untouched', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })
    act(() => {
      result.current.setFieldArrayValue('tags', ['x'])
    })

    expect(result.current.values.email).toBe('a@b.com')
  })

  it('marks the field dirty when the array contents actually differ from the initial value', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldArrayValue('tags', ['a', 'b'])
    })

    expect(result.current.dirty.tags).toBe(true)
  })

  it('does not mark the field dirty when set to a new array reference with equal contents', () => {
    const values = { ...initialValues, tags: ['a', 'b'] }
    const { result } = renderHook(() => useForm(values))

    act(() => {
      // Same contents as the initial array, but deliberately a fresh array
      // reference (e.g. from a reorder-and-undo) - dirty tracking compares
      // by value, not by reference, so this should stay pristine.
      result.current.setFieldArrayValue('tags', ['a', 'b'])
    })

    expect(result.current.dirty.tags).toBe(false)
  })
})

describe('useForm - isDirty', () => {
  it('is false when nothing has changed', () => {
    const { result } = renderHook(() => useForm(initialValues))
    expect(result.current.isDirty).toBe(false)
  })

  it('becomes true once any field differs from its initial value', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.isDirty).toBe(true)
  })

  it('becomes false again once the only changed field is reverted', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })
    act(() => {
      result.current.setFieldValue('email', initialValues.email)
    })

    expect(result.current.isDirty).toBe(false)
  })

  it('stays true if one of several changed fields is reverted while another remains changed', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })
    act(() => {
      result.current.setFieldValue('password', 'hunter2')
    })
    act(() => {
      result.current.setFieldValue('email', initialValues.email)
    })

    expect(result.current.isDirty).toBe(true)
  })

  it('is unaffected by touched or error state - only values matter', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldTouched('email', true)
    })
    act(() => {
      result.current.setFieldError('email', 'Invalid email')
    })

    expect(result.current.isDirty).toBe(false)
  })
})

describe('useForm - setFieldError', () => {
  it('sets a single field error', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldError('email', 'Invalid email')
    })

    expect(result.current.errors.email).toBe('Invalid email')
  })

  it('accumulates errors across multiple calls rather than replacing the whole object', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldError('email', 'Invalid email')
    })
    act(() => {
      result.current.setFieldError('password', 'Too short')
    })

    expect(result.current.errors).toEqual({
      email: 'Invalid email',
      password: 'Too short',
    })
  })

  it('overwrites a previous error on the same field', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldError('email', 'First message')
    })
    act(() => {
      result.current.setFieldError('email', 'Second message')
    })

    expect(result.current.errors.email).toBe('Second message')
  })
})

describe('useForm - setFieldTouched', () => {
  it('marks a single field touched', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldTouched('email', true)
    })

    expect(result.current.touched.email).toBe(true)
  })

  it('can mark a field untouched again', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldTouched('email', true)
    })
    act(() => {
      result.current.setFieldTouched('email', false)
    })

    expect(result.current.touched.email).toBe(false)
  })

  it('accumulates touched state across fields', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldTouched('email', true)
    })
    act(() => {
      result.current.setFieldTouched('password', true)
    })

    expect(result.current.touched).toEqual({ email: true, password: true })
  })
})

describe('useForm - validate', () => {
  it('returns true and clears errors when the resolver reports no errors', () => {
    const { result } = renderHook(() => useForm(initialValues))

    let isValid = false
    act(() => {
      isValid = result.current.validate(() => ({}))
    })

    expect(isValid).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it('returns false and stores errors when the resolver reports errors', () => {
    const { result } = renderHook(() => useForm(initialValues))

    let isValid = true
    act(() => {
      isValid = result.current.validate(() => ({ email: 'Required' }))
    })

    expect(isValid).toBe(false)
    expect(result.current.errors).toEqual({ email: 'Required' })
  })

  it('replaces the previous errors object rather than merging into it', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldError('password', 'stale error')
    })
    act(() => {
      result.current.validate(() => ({ email: 'Required' }))
    })

    expect(result.current.errors).toEqual({ email: 'Required' })
  })

  it('validates against the latest values, not a stale snapshot', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    let seenEmail: string | undefined
    act(() => {
      result.current.validate((values) => {
        seenEmail = values.email
        return {}
      })
    })

    expect(seenEmail).toBe('a@b.com')
  })
})

describe('useForm - resetForm', () => {
  it('resets changed values back to the original initial values', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.values).toEqual(initialValues)
  })

  it('clears errors', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldError('email', 'Invalid')
    })
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.errors).toEqual({})
  })

  it('clears touched state', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldTouched('email', true)
    })
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.touched).toEqual({})
  })

  it('clears dirty state', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.dirty).toEqual({})
    expect(result.current.isDirty).toBe(false)
  })

  it('re-baselines to newValues when given an argument, instead of the original initialValues', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const newValues = { ...initialValues, email: 'saved@b.com' }

    act(() => {
      result.current.setFieldValue('email', 'draft@b.com')
    })
    act(() => {
      result.current.resetForm(newValues)
    })

    expect(result.current.values).toEqual(newValues)
    expect(result.current.dirty).toEqual({})
    expect(result.current.isDirty).toBe(false)
  })

  it('computes future dirty state relative to a newValues baseline, not the original initialValues', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const newValues = { ...initialValues, email: 'saved@b.com' }

    act(() => {
      result.current.resetForm(newValues)
    })
    act(() => {
      // Same value as the NEW baseline - should be pristine, even though
      // it differs from the ORIGINAL initialValues.
      result.current.setFieldValue('email', 'saved@b.com')
    })

    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.setFieldValue('email', 'something-else@b.com')
    })

    expect(result.current.isDirty).toBe(true)
  })

  it('falls back to the most recently set baseline when called again with no arguments', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const newValues = { ...initialValues, email: 'saved@b.com' }

    act(() => {
      result.current.resetForm(newValues)
    })
    act(() => {
      result.current.setFieldValue('email', 'draft-again@b.com')
    })
    act(() => {
      result.current.resetForm()
    })

    // Not the ORIGINAL initialValues - the baseline resetForm(newValues)
    // most recently established.
    expect(result.current.values).toEqual(newValues)
    expect(result.current.isDirty).toBe(false)
  })

  it('does NOT reset submissionStatus - that is a separate concern', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.updateSubmissionStatus('success')
    })
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.submissionStatus).toBe('success')
  })
})

describe('useForm - submission status', () => {
  it('updateSubmissionStatus sets the status', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.updateSubmissionStatus('submitting')
    })

    expect(result.current.submissionStatus).toBe('submitting')
  })

  it.each(['idle', 'submitting', 'success', 'error'] as const)(
    'accepts %s as a valid status',
    (status) => {
      const { result } = renderHook(() => useForm(initialValues))

      act(() => {
        result.current.updateSubmissionStatus(status)
      })

      expect(result.current.submissionStatus).toBe(status)
    },
  )

  it('resetSubmissionStatus is shorthand for updateSubmissionStatus("idle")', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.updateSubmissionStatus('error')
    })
    act(() => {
      result.current.resetSubmissionStatus()
    })

    expect(result.current.submissionStatus).toBe('idle')
  })
})

describe('useForm - registerFieldRef / setFocus', () => {
  function createFakeInput(): Focusable & { focus: jest.Mock } {
    return { focus: jest.fn() }
  }

  it('focuses a registered field', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const input = createFakeInput()

    act(() => {
      result.current.registerFieldRef('email', input)
    })
    act(() => {
      result.current.setFocus('email')
    })

    expect(input.focus).toHaveBeenCalledTimes(1)
  })

  it('does nothing (does not throw) when focusing a field that was never registered', () => {
    const { result } = renderHook(() => useForm(initialValues))

    expect(() => {
      act(() => {
        result.current.setFocus('email')
      })
    }).not.toThrow()
  })

  it('stops focusing a field after it is unregistered with null', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const input = createFakeInput()

    act(() => {
      result.current.registerFieldRef('email', input)
    })
    act(() => {
      result.current.registerFieldRef('email', null)
    })
    act(() => {
      result.current.setFocus('email')
    })

    expect(input.focus).not.toHaveBeenCalled()
  })

  it('focusing calls the most recently registered ref for a field', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const firstInput = createFakeInput()
    const secondInput = createFakeInput()

    act(() => {
      result.current.registerFieldRef('email', firstInput)
    })
    act(() => {
      result.current.registerFieldRef('email', secondInput)
    })
    act(() => {
      result.current.setFocus('email')
    })

    expect(firstInput.focus).not.toHaveBeenCalled()
    expect(secondInput.focus).toHaveBeenCalledTimes(1)
  })

  it('registering a field ref does not itself trigger a re-render', () => {
    let renderCount = 0
    const { result } = renderHook(() => {
      renderCount += 1
      return useForm(initialValues)
    })
    const input = createFakeInput()
    const renderCountBefore = renderCount

    act(() => {
      result.current.registerFieldRef('email', input)
    })

    expect(renderCount).toBe(renderCountBefore)
  })
})

describe('useForm - callback identity stability', () => {
  it('keeps setFieldValue referentially stable across unrelated updates', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const setFieldValueBefore = result.current.setFieldValue

    act(() => {
      result.current.setFieldTouched('email', true)
    })

    expect(result.current.setFieldValue).toBe(setFieldValueBefore)
  })

  it('keeps setFieldValue referentially stable even when initialValues changes reference on a later render', () => {
    const { result, rerender } = renderHook(({ values }) => useForm(values), {
      initialProps: { values: initialValues },
    })
    const setFieldValueBefore = result.current.setFieldValue

    // Mirrors a parent whose data comes from a cache that just refetched
    // (e.g. RTK Query / React Query invalidating a tag) - a brand new
    // object reference for conceptually the same values, arriving via a
    // normal re-render.
    rerender({ values: { ...initialValues } })

    expect(result.current.setFieldValue).toBe(setFieldValueBefore)
  })

  it('does not reset state when initialValues changes reference on a later render', () => {
    const { result, rerender } = renderHook(({ values }) => useForm(values), {
      initialProps: { values: initialValues },
    })

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    rerender({ values: { ...initialValues } })

    // The hook only reads initialValues once, at mount - a later render
    // with a new (even if content-identical) reference must never
    // silently rebase a form the user might be mid-edit on.
    expect(result.current.values.email).toBe('a@b.com')
    expect(result.current.isDirty).toBe(true)
  })

  it('keeps setFieldTouched referentially stable across unrelated updates', () => {
    const { result } = renderHook(() => useForm(initialValues))
    const setFieldTouchedBefore = result.current.setFieldTouched

    act(() => {
      result.current.setFieldValue('email', 'a@b.com')
    })

    expect(result.current.setFieldTouched).toBe(setFieldTouchedBefore)
  })
})
