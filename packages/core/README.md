# react-fatless-form 🥬

![License](https://img.shields.io/github/license/aderahenry/react-fatless-form) ![npm version](https://img.shields.io/npm/v/react-fatless-form) ![bundle size](https://img.shields.io/bundlephobia/minzip/react-fatless-form)

Headless, deeply-typed React form state management. Zero DOM/RN knowledge - manages values, validation errors, touched state, dirty state, and submission lifecycle, then gives you everything you need to bind that state to whatever UI you're rendering.

You'll usually want one of the platform packages built on top of this one instead of importing it directly:

- **[react-fatless-form-web](../web/README.md)** - DOM bindings (`<input>`, `<select>`, `<input type="file">`, `<form>`)
- **[react-fatless-form-native](../native/README.md)** - React Native bindings (`TextInput`, `Switch`, keyboard handling)

Import this package directly if you're building a new platform binding, or a fully custom field-binding layer.

---

## Install

```sh
npm install react-fatless-form
```

```sh
yarn add react-fatless-form
```

```sh
pnpm add react-fatless-form
```

```sh
bun add react-fatless-form
```

[yup](https://www.npmjs.com/package/yup) is **not** a runtime dependency - `yupResolver` only needs yup's types (erased at compile time). If you use `yupResolver`, install [yup](https://www.npmjs.com/package/yup) yourself; any reasonably recent v1 version works.

---

## Migrating from v4?

v5 is a ground-up rewrite. See the [migration guide](../../README.md#coming-from-v4).

**tl;dr of what changed:**

- The all-in-one `Input` component, `FeedbackManager`/`FeedbackContainer`, and `validateSchema` are gone - v5 is fully headless
- `handleSubmit`'s positional `onSuccess`/`feedbackConfig` arguments are now a single `config` object
- Field paths now support deeply nested dot-notation (`'address.street'`) with full TypeScript inference
- `StringFieldPath`, `BooleanFieldPath`, `NumberFieldPath`, `StringArrayFieldPath` - typed path filters so your custom field components can't be wired to the wrong field type
- `form.setFocus('fieldName')` - imperative focus with typed field names
- React Native support via `react-fatless-form-native`

---

## Quick start

```tsx
import { useForm, FormProvider, useFormContext, useField, handleSubmit, yupResolver } from 'react-fatless-form'
import * as yup from 'yup'

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email address is required'),
  password: yup
    .string()
    .min(8)
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
})

type SignupValues = yup.InferType<typeof schema>

function SignupForm() {
  const form = useForm<SignupValues>({ email: '', password: '' })

  const onSubmit = () =>
    handleSubmit(form, yupResolver(schema), async ({confirmPassword, ...values}) => {
      await api.signup(values)
    },
    {
      onSuccess: response => toast.success(response.message),
      onError: error => handleError(error)
    })

  return (
    <FormProvider form={form}>
      <EmailField />
      <PasswordField />
      <ConfirmPasswordField />
      <button onClick={onSubmit}>Sign up</button>
    </FormProvider>
  )
}

function EmailField() {
  const { value, error, touched, setValue, onBlur } = useField<SignupValues>('email')

  return (
    <div>
      <input value={value ?? ''} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
      {touched && error && <span>{error}</span>}
    </div>
  )
}

function PasswordField() {
  const { value, error, touched, setValue, onBlur } = useField<SignupValues>('password')

  return (
    <div>
      <input value={value ?? ''} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
      {touched && error && <span>{error}</span>}
    </div>
  )
}

function ConfirmPasswordField() {
  const { value, error, touched, setValue, onBlur } = useField<SignupValues>('confirmPassword')

  return (
    <div>
      <input value={value ?? ''} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
      {touched && error && <span>{error}</span>}
    </div>
  )
}
```

That last bit - manually unwrapping `e.target.value` - is exactly what `react-fatless-form-web`/`-native` do for you.

---

## API

### `useForm(initialValues)`

Creates and owns a form's state. Returns a `UseFormReturn` object - pass it to `FormProvider`.

```tsx
const form = useForm<SignupValues>({ email: '', password: '' })
```

### `<FormProvider form={form}>`

Puts a form into context for `useFormContext`/`useField` to read downstream.

```tsx
<FormProvider form={form}>
  <EmailField />
</FormProvider>
```

### `useFormContext<TValues>()`

Reads the current form out of context. Always pass your values type explicitly.

```tsx
const form = useFormContext<SignupValues>()
```

### `useField<TValues>(name)`

Binds a single field - including nested paths like `'address.street'` - to the form in context. Returns the raw platform-agnostic binding: value, error, touched, dirty, setters, `onBlur`, `onFocus`, and `ref` (for `form.setFocus`).

```tsx
const { value, error, touched, dirty, setValue, setTouched, onBlur, onFocus, ref } = useField<SignupValues>('email')
```

### `form.dirty` / `form.isDirty`

`form.dirty` is a flat map of fields that currently differ from their initial values, keyed by field path - computed incrementally as each field changes, not by deep-comparing the whole form. `form.isDirty` is the derived whole-form convenience boolean: `true` if any field has changed.

```tsx
<button disabled={!form.isDirty}>Save changes</button>
```

### `handleSubmit(form, resolver, onSubmit, config?)`

Validates, then calls `onSubmit`. Tracks status (`idle` → `submitting` → `success`/`error`) automatically. Touches all invalid fields on failure so errors are immediately visible.

```tsx
await handleSubmit(form, yupResolver(schema), async (values) => {
  await api.signup(values)
}, 
{
  onSuccess: () => navigate('/welcome'),
  onError: error => handleError(error),
})
```

### `form.setFocus(name)`

Imperatively focuses a field by its typed path. Wire each field's `ref` prop to the underlying input first.

```tsx
// Jump from one field to the next
form.setFocus('lastName')
```

### `yupResolver(schema, abortEarly?)`

Builds a `ValidationResolver` from a yup schema. Don't use yup? A resolver is just `(values: TValues) => FormErrors<TValues>` - write your own.

### `createFormContext<TValues>()` / `createUseField(useFormProvider)`

For custom form contexts - multiple independent forms on screen at once, or design systems that shouldn't use the default singleton context.

```tsx
const { FormProvider: CheckoutProvider, useFormContext: useCheckoutContext } =
  createFormContext<CheckoutValues>()

const useCheckoutField = createUseField(useCheckoutContext)
```

### Typed field path utilities

Used to constrain custom field components so they can't accidentally be pointed at the wrong field type:

| Type | Constrains to fields typed as |
| ------ | ------------------------------- |
| `StringFieldPath<TValues>` | `string` |
| `BooleanFieldPath<TValues>` | `boolean` |
| `NumberFieldPath<TValues>` | `number` |
| `StringArrayFieldPath<TValues>` | `string[]` |
| `FileFieldPath<TValues>` | `File[]` (web package only) |

---

## License

MIT
