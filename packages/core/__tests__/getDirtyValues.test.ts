import { act, renderHook } from '@testing-library/react'

import { getDirtyValues } from '../src/getDirtyValues'
import type { DirtyValuesSource } from '../src/getDirtyValues'
import type { FormDirty, FormValues } from '../src/types'
import { useForm } from '../src/useForm'

interface ProfileValues {
  email: string
  address: { street: string; city: string }
  tags: string[]
  users: { firstName: string; lastName: string }[]
  groups: { name: string; members: { name: string }[] }[]
}

const initialValues: ProfileValues = {
  email: 'a@b.com',
  address: { street: 'Main St', city: 'Nairobi' },
  tags: ['red', 'blue'],
  users: [
    { firstName: 'Ann', lastName: 'Lee' },
    { firstName: 'Bo', lastName: 'Kim' },
  ],
  groups: [{ name: 'Admins', members: [{ name: 'Ann' }, { name: 'Bo' }] }],
}

/** A minimal `DirtyValuesSource` from a fixed values snapshot and dirty map - no `useForm()` needed. */
function mockForm<TValues extends FormValues>(
  values: TValues,
  dirty: FormDirty<TValues>,
): DirtyValuesSource<TValues> {
  return { dirty, getValues: () => values }
}

describe('getDirtyValues - basic filtering', () => {
  it('returns an empty object when nothing is dirty', () => {
    const form = mockForm(initialValues, {})
    expect(getDirtyValues(form)).toEqual({})
  })

  it('includes a single changed top-level field', () => {
    const values = { ...initialValues, email: 'new@b.com' }
    const form = mockForm(values, { email: true })
    expect(getDirtyValues(form)).toEqual({ email: 'new@b.com' })
  })

  it('excludes a field explicitly marked dirty: false', () => {
    const values = { ...initialValues, email: 'new@b.com' }
    const form = mockForm(values, { email: false })
    expect(getDirtyValues(form)).toEqual({})
  })

  it('excludes fields that changed in values but were never marked dirty', () => {
    // getDirtyValues trusts form.dirty - it never re-diffs values itself.
    const values = { ...initialValues, email: 'new@b.com', tags: ['red', 'green'] }
    const form = mockForm(values, { email: true })
    expect(getDirtyValues(form)).toEqual({ email: 'new@b.com' })
  })

  it('combines multiple unrelated dirty fields into one result', () => {
    const values = {
      ...initialValues,
      email: 'new@b.com',
      address: { ...initialValues.address, street: '5th Ave' },
    }
    const form = mockForm(values, { email: true, 'address.street': true })
    expect(getDirtyValues(form)).toEqual({
      email: 'new@b.com',
      address: { street: '5th Ave' },
    })
  })
})

describe('getDirtyValues - deep mode (default)', () => {
  it('reconstructs a nested path into its proper nested shape', () => {
    const values = { ...initialValues, address: { ...initialValues.address, street: '5th Ave' } }
    const form = mockForm(values, { 'address.street': true })
    expect(getDirtyValues(form)).toEqual({ address: { street: '5th Ave' } })
  })

  it('does not include an untouched sibling field on the same parent object', () => {
    const values = { ...initialValues, address: { ...initialValues.address, street: '5th Ave' } }
    const form = mockForm(values, { 'address.street': true })
    const result = getDirtyValues(form)
    expect(result.address).not.toHaveProperty('city')
  })
})

describe('getDirtyValues - flat mode', () => {
  it('returns a flat top-level key for a top-level field', () => {
    const values = { ...initialValues, email: 'new@b.com' }
    const form = mockForm(values, { email: true })
    expect(getDirtyValues(form, { flat: true })).toEqual({ email: 'new@b.com' })
  })

  it('returns a dot-notated key for a nested field rather than a nested object', () => {
    const values = { ...initialValues, address: { ...initialValues.address, street: '5th Ave' } }
    const form = mockForm(values, { 'address.street': true })
    const result = getDirtyValues(form, { flat: true })
    expect(result).toEqual({ 'address.street': '5th Ave' })
    expect(result).not.toHaveProperty('address')
  })
})

describe('getDirtyValues - atomic array replacement', () => {
  it('extracts the whole array when a single index is dirty (deep mode)', () => {
    const values = { ...initialValues, tags: ['red', 'green'] }
    const form = mockForm(values, { 'tags.1': true })
    expect(getDirtyValues(form)).toEqual({ tags: ['red', 'green'] })
  })

  it('extracts the whole array when a single index is dirty (flat mode), never a sparse index map', () => {
    const values = { ...initialValues, tags: ['red', 'green'] }
    const form = mockForm(values, { 'tags.1': true })
    const result = getDirtyValues(form, { flat: true })
    // toEqual is already an exact structural match - if this were the
    // sparse shape (e.g. a literal 'tags.1' key, or { tags: { 1: ... } })
    // instead of a real whole array under 'tags', it would fail right here.
    expect(result).toEqual({ tags: ['red', 'green'] })
  })

  it('produces a real array, never a sparse { 1: value } index map', () => {
    const values = { ...initialValues, tags: ['red', 'green'] }
    const form = mockForm(values, { 'tags.1': true })
    const result = getDirtyValues(form)
    expect(Array.isArray(result.tags)).toBe(true)
  })

  it('extracts the whole array when a property inside one array item is dirty', () => {
    const values = {
      ...initialValues,
      users: [
        { firstName: 'Annette', lastName: 'Lee' },
        { firstName: 'Bo', lastName: 'Kim' },
      ],
    }
    const form = mockForm(values, { 'users.0.firstName': true })
    expect(getDirtyValues(form)).toEqual({ users: values.users })
  })

  it('collapses to the outermost array when a path crosses more than one array', () => {
    const values = {
      ...initialValues,
      groups: [{ name: 'Admins', members: [{ name: 'Ann' }, { name: 'Bob' }] }],
    }
    const form = mockForm(values, { 'groups.0.members.1.name': true })
    expect(getDirtyValues(form)).toEqual({ groups: values.groups })
  })

  it('de-duplicates multiple dirty indices on the same array into a single entry', () => {
    const values = { ...initialValues, tags: ['pink', 'green'] }
    const form = mockForm(values, { 'tags.0': true, 'tags.1': true })
    expect(getDirtyValues(form)).toEqual({ tags: ['pink', 'green'] })
  })

  it('leaves an unrelated dirty field alongside an atomic array replacement', () => {
    const values = { ...initialValues, email: 'new@b.com', tags: ['red', 'green'] }
    const form = mockForm(values, { email: true, 'tags.1': true })
    expect(getDirtyValues(form)).toEqual({ email: 'new@b.com', tags: ['red', 'green'] })
  })
})

describe('getDirtyValues - source values', () => {
  it('does not mutate the object returned by getValues()', () => {
    const values = { ...initialValues, tags: ['red', 'green'] }
    const form = mockForm(values, { 'tags.1': true })

    getDirtyValues(form)

    expect(values).toEqual({ ...initialValues, tags: ['red', 'green'] })
  })
})

describe('getDirtyValues - with a real useForm() instance', () => {
  it('accepts a UseFormReturn directly, with no adaptation needed', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('email', 'new@b.com')
    })

    expect(getDirtyValues(result.current)).toEqual({ email: 'new@b.com' })
  })

  it('reflects an atomic array replacement from a real setFieldValue call on an index', () => {
    const { result } = renderHook(() => useForm(initialValues))

    act(() => {
      result.current.setFieldValue('tags.1', 'green')
    })

    expect(getDirtyValues(result.current)).toEqual({ tags: ['red', 'green'] })
  })
})
