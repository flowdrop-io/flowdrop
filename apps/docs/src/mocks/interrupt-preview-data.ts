/**
 * Mock data for interrupt prompt previews in the docs.
 * Each entry contains the config props needed by the corresponding prompt component.
 */

export const interruptPreviewData: Record<string, Record<string, unknown>> = {
  confirmation: {
    config: {
      message: 'Do you approve sending this email to 150 recipients?',
      confirmLabel: 'Yes, send email',
      cancelLabel: 'No, cancel'
    },
    isResolved: false,
    resolvedValue: undefined,
    isSubmitting: false,
    error: undefined,
    resolvedByUserName: undefined
  },

  choice: {
    config: {
      message: 'Select the output format:',
      options: [
        { value: 'json', label: 'JSON', description: 'Structured data' },
        { value: 'csv', label: 'CSV', description: 'Spreadsheet format' },
        { value: 'xml', label: 'XML', description: 'Markup language' }
      ],
      multiple: false
    },
    isResolved: false,
    resolvedValue: undefined,
    isSubmitting: false,
    error: undefined,
    resolvedByUserName: undefined
  },

  text_input: {
    config: {
      message: 'Provide additional context for this workflow step:',
      placeholder: 'Enter your notes...',
      multiline: true,
      maxLength: 500
    },
    isResolved: false,
    resolvedValue: undefined,
    isSubmitting: false,
    error: undefined,
    resolvedByUserName: undefined
  },

  form: {
    config: {
      message: 'Complete the deployment configuration:',
      schema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            title: 'Environment',
            enum: ['development', 'staging', 'production']
          },
          notify: {
            type: 'boolean',
            title: 'Send notification'
          },
          version: {
            type: 'string',
            title: 'Version Tag'
          }
        }
      },
      defaultValues: {
        environment: 'staging',
        notify: true,
        version: '1.0.0'
      }
    },
    isResolved: false,
    resolvedValue: undefined,
    isSubmitting: false,
    error: undefined,
    resolvedByUserName: undefined
  },

  review: {
    config: {
      message: 'Review these proposed changes:',
      changes: [
        {
          field: 'title',
          label: 'Page Title',
          original: 'About Us',
          proposed: 'About Our Company'
        },
        {
          field: 'description',
          label: 'Meta Description',
          original: 'Learn about our team.',
          proposed: 'Discover our company mission, values, and team.'
        }
      ]
    },
    isResolved: false,
    resolvedValue: undefined,
    isSubmitting: false,
    error: undefined,
    resolvedByUserName: undefined
  }
};
