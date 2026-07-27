# example-native

A signup form (first/last name, email, password, agree-to-terms) built with
[react-fatless-form-native](../../packages/native) and [React Native Paper](https://callstack.github.io/react-native-paper/) via Expo.

Demonstrates:

- `ControlledTextInput` and `ControlledCheckbox` wrapping Paper components - the same pattern for any design system
- `useTextField`, `useSwitchField`, `useFormSubmit` from `react-fatless-form-native`
- Why `SignupForm.tsx` splits into `SignupForm` (owns `useForm`/`FormProvider`) and `SignupFormFields` (calls `useFormSubmit`) - see the `useFormSubmit` section in [the native package's README](../../packages/native/README.md) for why that split is required
- `yupResolver` for validation
- `returnKeyType="next"` + `onSubmitEditing={() => form.setFocus('lastName')}` - the keyboard's return key walks the form without tapping each field
- Adapting `useSwitchField`'s `value/onValueChange` shape to Paper's `Checkbox` (`status/onPress` convention)

## Run it

```sh
yarn workspace example-native start
```

A `prestart` script builds `react-fatless-form` and `react-fatless-form-native` before Expo starts (Metro resolves those packages through their built `dist/` output). The first run pauses briefly while this happens - subsequent runs only rebuild if library source has changed.

Press `i` for iOS Simulator, `a` for Android, or scan the QR code with Expo Go.
