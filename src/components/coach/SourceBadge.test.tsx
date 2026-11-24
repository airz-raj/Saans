import { render, screen } from '@testing-library/react';
import { SourceBadge } from './SourceBadge';

describe('SourceBadge', () => {
  it('names the source and renders nothing without one', () => {
    const { container, rerender } = render(<SourceBadge source={undefined} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SourceBadge source="gemini" />);
    expect(screen.getByText(/Written by Gemini/)).toBeInTheDocument();
  });
});
