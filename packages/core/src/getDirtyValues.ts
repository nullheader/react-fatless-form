import { FieldPath, FieldValue, FormDirty, FormValues } from './types'
import { get, set } from './utils'

/**
 * The minimal shape {@link getDirtyValues} actually needs from a form: the
 * dirty map, and a synchronous read of the current values. A real
 * `UseFormReturn<TValues>` from `useForm()` already satisfies this
 * structurally, so you can pass one straight in - this is deliberately
 * narrower than `UseFormReturn` itself so this file has nothing to import
 * from `useForm.ts`, which is what keeps `getDirtyValues` tree-shakable for
 * consumers who don't use it, and keeps it callable in a test with a plain
 * object literal instead of a rendered hook.
 */
export interface DirtyValuesSource<TValues extends FormValues> {
  dirty: FormDirty<TValues>
  getValues: () => TValues
}

/** Options for {@link getDirtyValues}. */
export interface GetDirtyValuesOptions {
  /**
   * `false` (default): reconstruct the changed fields into a deep object
   * matching your form's actual shape, e.g. `{ user: { profile: { name:
   * "..." } } }`.
   *
   * `true`: return a flat object keyed by dot-notated field path instead,
   * e.g. `{ 'user.profile.name': "..." }` - handy when your API expects
   * flat PATCH bodies rather than nested ones.
   *
   * Either way, a change under an array always contributes that array's
   * *whole* root path - see {@link getDirtyValues}.
   */
  flat?: boolean
}

/**
 * The shape {@link getDirtyValues} returns when called with `{ flat: true }`:
 * one entry per changed field (or changed array, per the atomic-array
 * rule), keyed by dot-notated field path, each holding exactly the value
 * type that field/path would have on `TValues` itself.
 */
export type FlatDirtyValues<TValues extends FormValues> = {
  [TField in FieldPath<TValues>]?: FieldValue<TValues, TField>
}

/**
 * If `path` runs through an array - either an array element itself
 * (`'tags.1'`) or something nested inside one (`'users.0.firstName'`) -
 * returns the path to that array's own root (`'tags'`, `'users'`).
 * Otherwise returns `path` unchanged.
 *
 * Only the outermost array matters when a path crosses more than one, e.g.
 * `'groups.0.members.1.name'` collapses all the way to `'groups'` rather
 * than stopping at `'groups.0.members'` - replacing the whole outer array
 * already carries everything nested inside it, and a backend PATCH body
 * shouldn't need to know an inner array moved independently of its parent.
 */
function arrayRootPath(path: string): string {
  const segments = path.split('.')

  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index]
    if (segment !== undefined && /^\d+$/.test(segment)) {
      return segments.slice(0, index).join('.')
    }
  }

  return path
}

/**
 * Extracts only the fields that have changed from their initial values -
 * exactly what a PATCH request body should contain, instead of re-sending a
 * whole form's worth of values the server already has. A thin wrapper
 * around {@link handleSubmit} (or a plain submit handler) is the usual
 * place to call this:
 *
 * @example
 * ```tsx
 * const onSubmit = (values: ProfileValues) => {
 *   const changes = getDirtyValues(form) // Partial<ProfileValues>
 *   return api.patch(`/users/${id}`, changes)
 * }
 * ```
 *
 * **Arrays are replaced atomically, never merged field-by-field.** If any
 * dirty path runs through an array - `'tags.1'`, or something nested inside
 * one like `'users.0.firstName'` - the *entire* array at that path is
 * included, not a sparse per-index patch. A payload like
 * `{ tags: { 1: "updated" } }` looks like an object to most JSON
 * deserializers, not an array with one changed slot, and typically either
 * fails to parse or silently drops the rest of the array; sending the
 * whole `tags` array sidesteps that entirely. This is also why the
 * function reads through `form.getValues()` rather than trying to patch
 * around individual dirty indices - it always needs the real, current
 * array to hand back.
 *
 * The `values`/`initialValues` themselves are never compared here - that
 * work already happened when `useForm` set `form.dirty` on each mutation
 * (see the dirty-state tracking this builds on). This function only reads
 * `form.dirty` to decide *which* paths to pull out of `form.getValues()`.
 *
 * @typeParam TValues - Your form's value shape.
 * @param form - Anything with a `dirty` map and a `getValues()` reader -
 * see {@link DirtyValuesSource}. Pass your `useForm()` result directly.
 * @param options - See {@link GetDirtyValuesOptions}. Omit for a deep,
 * nested result matching your form's own shape.
 */
export function getDirtyValues<TValues extends FormValues>(
  form: DirtyValuesSource<TValues>,
  options: { flat: true },
): FlatDirtyValues<TValues>
export function getDirtyValues<TValues extends FormValues>(
  form: DirtyValuesSource<TValues>,
  options?: GetDirtyValuesOptions,
): Partial<TValues>
export function getDirtyValues<TValues extends FormValues>(
  form: DirtyValuesSource<TValues>,
  options: GetDirtyValuesOptions = {},
): Partial<TValues> | FlatDirtyValues<TValues> {
  const values = form.getValues()

  // Collapse every genuinely-dirty leaf path down to its nearest enclosing
  // array's root (a no-op for paths that never cross an array), then
  // de-duplicate: `tags.0` and `tags.1` both being dirty should still only
  // contribute the `tags` array once, not twice.
  const dirtyPaths = new Set<string>()
  for (const path of Object.keys(form.dirty) as FieldPath<TValues>[]) {
    if (form.dirty[path]) {
      dirtyPaths.add(arrayRootPath(path))
    }
  }

  if (options.flat) {
    const flatValues: Record<string, unknown> = {}
    for (const path of dirtyPaths) {
      flatValues[path] = get(values, path)
    }
    return flatValues as FlatDirtyValues<TValues>
  }

  // Reuses `set` - the same immutable path-writer `useForm` itself uses -
  // rather than reimplementing object/array reconstruction here. `path`
  // has already been resolved to something known to exist on `values` (it
  // came from `form.dirty`, by way of `arrayRootPath` above), so this is
  // exactly `set`'s intended use; only its precise, field-path-checked
  // overload can't be selected because `path`'s array-root-collapsed type
  // is a plain `string` by this point, not a literal `FieldPath<TValues>`.
  const deepValues = Array.from(dirtyPaths).reduce<Record<string, unknown>>(
    (accumulator, path) => set(accumulator, path, get(values, path)),
    {},
  )
  return deepValues as Partial<TValues>
}
