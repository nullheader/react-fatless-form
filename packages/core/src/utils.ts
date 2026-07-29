import { FieldPath, FieldValue, FormValues, PlatformFieldValue } from './types'

/**
 * Normalizes bracket-notation array indices to dot-notation, e.g.
 * `users[0].name` → `users.0.name`. FieldPath (and everything keyed by it -
 * FormErrors, FormTouched, useField) always uses dot-notation, but some
 * sources - notably yup's ValidationError#path for array items - report
 * bracket notation. Anything that accepts a path from outside this package
 * should normalize it through here first.
 */
export function normalizePath(path: string): string {
  return path.replace(/\[(\d+)\]/g, '.$1')
}

/** Retrieves a deeply nested value from an object using a dot-notated string path. */
export function get<TValues extends FormValues, TField extends FieldPath<TValues>>(
  obj: TValues,
  path: TField,
): FieldValue<TValues, TField> | undefined
// Deliberately permissive fallback overload, for arbitrary/external paths
// (e.g. from a yup ValidationError, or any path not statically known to be a
// FieldPath) with an optional default. The precisely-typed overload above is what most
// call sites actually hit; this one exists for the rest.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
export function get(obj: any, path: string, defaultValue?: any): any
export function get(obj: unknown, path: string, defaultValue?: unknown): unknown {
  if (!path) return undefined

  const keys = normalizePath(path).split('.')

  let result: unknown = obj
  for (const key of keys) {
    // The runtime walk here genuinely can't be typed step-by-step - we don't
    // statically know the shape at each segment of an arbitrary path. This
    // one cast is the honest way to express that; nothing else in this
    // function needs it, since the overloads above are what give callers
    // real type safety.
    result = (result as Record<string, unknown> | null | undefined)?.[key]
    if (result === undefined) return defaultValue
  }
  return result
}

/**
 * Immutably sets a deeply nested value in an object using a dot-notated string path.
 * This ensures React detects state changes correctly.
 */
export function set<TValues extends FormValues, TField extends FieldPath<TValues>>(
  obj: TValues,
  path: TField,
  value: FieldValue<TValues, TField> | PlatformFieldValue,
): TValues
// Same rationale as `get`'s permissive overload above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
export function set(obj: any, path: string, value: any): any
export function set(obj: unknown, path: string, value: unknown): unknown {
  if (!path) return obj

  const keys = normalizePath(path).split('.')
  // Same reasoning as `get`: an arbitrary, runtime string path can't be typed
  // step-by-step. `Record<string, unknown>` (rather than `any`) still keeps
  // every assignment below honest about being a keyed read/write, just
  // without knowing the value type in advance.
  const root: Record<string, unknown> | unknown[] = Array.isArray(obj)
    ? [...obj]
    : { ...(obj as Record<string, unknown>) }
  let current: Record<string, unknown> = root as Record<string, unknown>

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (key === undefined) {
      // Unreachable given the loop bounds (i < keys.length), but
      // noUncheckedIndexedAccess can't see that invariant - this is the
      // honest way to satisfy it without a non-null assertion.
      break
    }

    const isLast = i === keys.length - 1

    if (isLast) {
      current[key] = value
    } else {
      const nextKey = keys[i + 1]
      if (nextKey === undefined) {
        // Unreachable: isLast is false here, so i + 1 < keys.length.
        break
      }

      const isNumericKey = /^\d+$/.test(nextKey)

      // Shallow clone the next level down
      if (Array.isArray(current[key])) {
        current[key] = [...(current[key] as unknown[])]
      } else if (typeof current[key] === 'object' && current[key] !== null) {
        current[key] = { ...(current[key] as Record<string, unknown>) }
      } else {
        // Create array or object if it doesn't exist
        current[key] = isNumericKey ? [] : {}
      }
      current = current[key] as Record<string, unknown>
    }
  }

  return root
}