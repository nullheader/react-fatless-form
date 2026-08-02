import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'

import { createFormContext } from '../src/createFormContext'
import { createUseField, useField } from '../src/createUseField'
import type { Focusable } from '../src/types'
import { useForm } from '../src/useForm'
import { renderWithForm } from './test-utils'

interface SignupValues {
  email: string
  remember: boolean
  address: { street: string }
  tags: string[]
}

const initialValues: SignupValues = {
  email: '',
  remember: false,
  address: { street: '' },
  tags: [],
}

describe('useField', () => {
  it('echoes back the field name', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)
    expect(result.current.name).toBe('email')
  })

  it('reads the current value of a top-level field', () => {
    const values = { ...initialValues, email: 'a@b.com' }
    const { result } = renderWithForm(() => useField<SignupValues>('email'), values)
    expect(result.current.value).toBe('a@b.com')
  })

  it('reads the current value of a nested field', () => {
    const values = { ...initialValues, address: { street: '123 Main St' } }
    const { result } = renderWithForm(
      () => useField<SignupValues>('address.street'),
      values,
    )
    expect(result.current.value).toBe('123 Main St')
  })

  it('has no error or touched state initially', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)
    expect(result.current.error).toBeUndefined()
    expect(result.current.touched).toBeUndefined()
  })

  it('has no dirty state initially', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)
    expect(result.current.dirty).toBeUndefined()
  })

  it('picks up an error set on the form', () => {
    const { result, form } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      form.current.setFieldError('email', 'Invalid email')
    })

    expect(result.current.error).toBe('Invalid email')
  })

  it('picks up touched state set on the form', () => {
    const { result, form } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      form.current.setFieldTouched('email', true)
    })

    expect(result.current.touched).toBe(true)
  })

  it('picks up dirty state once the field diverges from its initial value', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      result.current.setValue('a@b.com')
    })

    expect(result.current.dirty).toBe(true)
  })

  it('setValue only marks its own field dirty', () => {
    const { result: emailResult, form } = renderWithForm(
      () => useField<SignupValues>('email'),
      initialValues,
    )

    act(() => {
      emailResult.current.setValue('a@b.com')
    })

    expect(form.current.dirty.remember).toBeUndefined()
  })

  it('setValue updates the value through the form and is reflected back', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      result.current.setValue('a@b.com')
    })

    expect(result.current.value).toBe('a@b.com')
  })

  it('setValue only affects its own field', () => {
    const { result: emailResult, form } = renderWithForm(
      () => useField<SignupValues>('email'),
      initialValues,
    )

    act(() => {
      emailResult.current.setValue('a@b.com')
    })

    expect(form.current.values.remember).toBe(false)
  })

  it('setTouched sets touched state directly', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      result.current.setTouched(true)
    })

    expect(result.current.touched).toBe(true)
  })

  it('onBlur marks an untouched field as touched', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      result.current.onBlur()
    })

    expect(result.current.touched).toBe(true)
  })

  it('onBlur is a no-op once the field is already touched (no redundant update)', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    act(() => {
      result.current.setTouched(true)
    })

    const valueBeforeSecondBlur = result.current
    act(() => {
      result.current.onBlur()
    })

    // Since touched was already true, the guarded onBlur should not have
    // produced a new render at all, so this is still the exact same object.
    expect(result.current).toBe(valueBeforeSecondBlur)
  })

  it('onFocus does not throw and causes no state change', () => {
    const { result } = renderWithForm(() => useField<SignupValues>('email'), initialValues)

    expect(() => {
      act(() => {
        result.current.onFocus()
      })
    }).not.toThrow()
    expect(result.current.touched).toBeUndefined()
  })

  it('ref registers the field so form.setFocus can find it', () => {
    const { result, form } = renderWithForm(() => useField<SignupValues>('email'), initialValues)
    const input: Focusable = { focus: jest.fn() }

    act(() => {
      result.current.ref(input)
    })
    act(() => {
      form.current.setFocus('email')
    })

    expect(input.focus).toHaveBeenCalledTimes(1)
  })

  it('ref(null) unregisters the field', () => {
    const { result, form } = renderWithForm(() => useField<SignupValues>('email'), initialValues)
    const input: Focusable = { focus: jest.fn() }

    act(() => {
      result.current.ref(input)
    })
    act(() => {
      result.current.ref(null)
    })
    act(() => {
      form.current.setFocus('email')
    })

    expect(input.focus).not.toHaveBeenCalled()
  })

  it('reads array-indexed field paths', () => {
    const values = { ...initialValues, tags: ['first', 'second'] }
    const { result } = renderWithForm(() => useField<SignupValues>('tags.1'), values)
    expect(result.current.value).toBe('second')
  })
})

describe('createUseField', () => {
  it('produces a hook bound to a custom form context, independent of the default one', () => {
    const { FormProvider: CustomProvider, useFormContext: useCustomContext } =
      createFormContext<SignupValues>()
    const useCustomField = createUseField(useCustomContext)

    // Wiring mirrors renderWithForm (from test-utils.tsx), but against the
    // *custom* provider rather than the package's default one - proving
    // createUseField's hook reads from whatever context it was built with.
    const form: { current: ReturnType<typeof useCustomContext> | null } = { current: null }

    function Wrapper({ children }: { children: ReactNode }) {
      const formInstance = useForm<SignupValues>(initialValues)
      form.current = formInstance
      return <CustomProvider form={formInstance}>{children}</CustomProvider>
    }

    const { result } = renderHook(() => useCustomField('email'), { wrapper: Wrapper })

    expect(result.current.value).toBe('')

    act(() => {
      result.current.setValue('a@b.com')
    })

    expect(result.current.value).toBe('a@b.com')
    expect(form.current?.values.email).toBe('a@b.com')
  })

  it('the produced hook does not read from the default FormProvider context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { useFormContext: useCustomContext } = createFormContext<SignupValues>()
    const useCustomField = createUseField(useCustomContext)

    // renderWithForm wraps in the *default* FormProvider only - the custom
    // field hook still needs its own provider, so this should throw.
    expect(() => renderWithForm(() => useCustomField('email'), initialValues)).toThrow(
      'useFormContext must be used within a FormProvider.',
    )

    spy.mockRestore()
  })
})
