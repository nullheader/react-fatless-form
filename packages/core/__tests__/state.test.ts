import { createEmptyDirty, createEmptyErrors, createEmptyTouched, createFormState } from '../src/state'

interface SignupValues {
  email: string
  password: string
}

describe('createEmptyErrors', () => {
  it('returns an empty object', () => {
    expect(createEmptyErrors<SignupValues>()).toEqual({})
  })

  it('returns a fresh object on every call, not a shared reference', () => {
    expect(createEmptyErrors<SignupValues>()).not.toBe(createEmptyErrors<SignupValues>())
  })
})

describe('createEmptyTouched', () => {
  it('returns an empty object', () => {
    expect(createEmptyTouched<SignupValues>()).toEqual({})
  })

  it('returns a fresh object on every call, not a shared reference', () => {
    expect(createEmptyTouched<SignupValues>()).not.toBe(createEmptyTouched<SignupValues>())
  })
})

describe('createEmptyDirty', () => {
  it('returns an empty object', () => {
    expect(createEmptyDirty<SignupValues>()).toEqual({})
  })

  it('returns a fresh object on every call, not a shared reference', () => {
    expect(createEmptyDirty<SignupValues>()).not.toBe(createEmptyDirty<SignupValues>())
  })
})

describe('createFormState', () => {
  it('seeds values with exactly what was passed in', () => {
    const initialValues: SignupValues = { email: 'a@b.com', password: 'hunter2' }
    const state = createFormState(initialValues)
    expect(state.values).toEqual(initialValues)
  })

  it('starts with empty errors, touched, and dirty', () => {
    const state = createFormState<SignupValues>({ email: '', password: '' })
    expect(state.errors).toEqual({})
    expect(state.touched).toEqual({})
    expect(state.dirty).toEqual({})
  })

  it('preserves the exact reference of the initial values object', () => {
    const initialValues: SignupValues = { email: '', password: '' }
    const state = createFormState(initialValues)
    expect(state.values).toBe(initialValues)
  })

  it('produces independent errors/touched/dirty objects across two calls', () => {
    const stateA = createFormState<SignupValues>({ email: '', password: '' })
    const stateB = createFormState<SignupValues>({ email: '', password: '' })
    expect(stateA.errors).not.toBe(stateB.errors)
    expect(stateA.touched).not.toBe(stateB.touched)
    expect(stateA.dirty).not.toBe(stateB.dirty)
  })
})
