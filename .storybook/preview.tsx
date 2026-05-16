import type { Preview } from '@storybook/react-vite'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="bg-background p-6 font-bengali text-foreground">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;