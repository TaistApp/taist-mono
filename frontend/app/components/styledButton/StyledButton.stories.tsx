import type { Meta, StoryObj } from '@storybook/react-native';
import StyledButton from './index';

const meta: Meta<typeof StyledButton> = {
  title: 'Components/StyledButton',
  component: StyledButton,
  argTypes: {
    title: {
      control: 'text',
      description: 'Button label text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    onPress: {
      action: 'pressed',
      description: 'Callback when button is pressed',
    },
  },
  args: {
    title: 'Click Me',
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof StyledButton>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    title: 'Disabled Button',
    disabled: true,
  },
};

export const LongText: Story = {
  args: {
    title: 'This is a very long button label',
  },
};

export const AddButton: Story = {
  args: {
    title: 'ADD',
  },
};
