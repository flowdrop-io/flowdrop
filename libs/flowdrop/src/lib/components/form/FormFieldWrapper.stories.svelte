<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FormFieldWrapper from './FormFieldWrapper.svelte';
  import FormTextField from './FormTextField.svelte';
  import FormToggle from './FormToggle.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Field wrapper',
    component: FormFieldWrapper,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    argTypes: {
      label: { control: 'text' },
      required: { control: 'boolean' },
      description: { control: 'text' }
    },
    args: { id: 'subject', label: 'Subject' }
  });
</script>

<script lang="ts">
  let subject = $state('Your order has shipped');
  let stream = $state(true);
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The frame the field factory puts around every field: label, required mark, the field, and its help text.'
      }
    }
  }}
>
  <div style="max-width: 22rem">
    <FormFieldWrapper
      id="subject"
      label="Subject"
      required
      description="Shown in the email header."
    >
      <FormTextField
        id="subject"
        value={subject}
        ariaDescribedBy="subject-description"
        onChange={(v) => (subject = v)}
      />
    </FormFieldWrapper>
  </div>
</Story>

<Story
  name="With a switch"
  asChild
  parameters={{
    docs: {
      description: {
        story: "With `inline`, the switch sits on the label's row and the help goes underneath."
      }
    }
  }}
>
  <div style="max-width: 22rem">
    <FormFieldWrapper
      id="stream"
      label="Stream the reply"
      inline
      description="Send words as they arrive."
    >
      <FormToggle id="stream" value={stream} onChange={(v) => (stream = v)} />
    </FormFieldWrapper>
  </div>
</Story>

<Story
  name="With a note"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          '`aside` adds a short muted note on the label row, as an array field does ("Matched in order").'
      }
    }
  }}
>
  <div style="max-width: 22rem">
    <FormFieldWrapper id="rules" label="Rules" aside="Matched in order">
      <FormTextField id="rules" value="" onChange={() => {}} placeholder="First rule" />
    </FormFieldWrapper>
  </div>
</Story>
