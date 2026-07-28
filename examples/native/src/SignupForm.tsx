import * as yup from 'yup'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useForm, FormProvider, useFormContext, useFormSubmit, yupResolver } from 'react-fatless-form-native'
import ControlledTextInput from './fields/ControlledTextInput'
import ControlledCheckbox from './fields/ControlledCheckbox'

const initialValues: SignupValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  agreeToTerms: false,
}

const schema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Enter a valid email address').required('Email is required'),
  password: yup.string().min(8, 'Must be at least 8 characters').required('Password is required'),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], 'You must agree to the terms to continue')
    .required(),
})

type SignupValues = yup.InferType<typeof schema>

// Pretend API call - swap for the real thing.
async function signUp(values: SignupValues): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  console.log('signed up:', values)
}

export default function SignupForm() {
  const form = useForm<SignupValues>(initialValues)

  return (
    <FormProvider form={form}>
      <SignupFormFields />
    </FormProvider>
  )
}

function SignupFormFields() {
  const form = useFormContext<SignupValues>()

  const onSubmit = useFormSubmit<SignupValues>(yupResolver(schema), signUp, {
    onSuccess: () => {
      form.resetForm()
    },
  })

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
          Create your account
        </Text>

        {/* returnKeyType + onSubmitEditing + form.setFocus chain the fields
            together so the keyboard's return key moves through the form
            without the user needing to tap each field by hand. */}
        <ControlledTextInput<SignupValues>
          name="firstName"
          label="First name"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => form.setFocus('lastName')}
        />
        <ControlledTextInput<SignupValues>
          name="lastName"
          label="Last name"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => form.setFocus('email')}
        />
        <ControlledTextInput<SignupValues>
          name="email"
          label="Email"
          keyboardType="email-address"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => form.setFocus('password')}
        />
        <ControlledTextInput<SignupValues>
          name="password"
          label="Password"
          secureTextEntry
          returnKeyType="done"
        />
        <ControlledCheckbox<SignupValues> name="agreeToTerms" label="I agree to the terms of service" />

        {form.submissionStatus === 'success' && (
          <Text variant="bodySmall" style={{ color: 'green', marginBottom: 8 }}>
            Account created - check your inbox to verify your email.
          </Text>
        )}
        {form.submissionStatus === 'error' && (
          <Text variant="bodySmall" style={{ color: 'red', marginBottom: 8 }}>
            Something went wrong. Please try again.
          </Text>
        )}

        <Button mode="contained" loading={form.submissionStatus === 'submitting'} onPress={onSubmit}>
          Sign up
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
