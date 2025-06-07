import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Spinner from '../../../components/Spinner';

// Mock lottie-web
const mockLottieAnimation = {
  destroy: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
};

const mockLottie = {
  loadAnimation: vi.fn(() => mockLottieAnimation),
};

// Mock the dynamic import of lottie-web
vi.mock('lottie-web', () => ({
  default: mockLottie,
}));

// Mock window object for SSR checks
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000' },
  writable: true,
});

describe('Spinner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock for each test
    mockLottie.loadAnimation.mockReturnValue(mockLottieAnimation);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders spinner container', () => {
      render(<Spinner />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'justify-center', 'items-center', 'py-4');
    });

    it('renders with default large size', () => {
      render(<Spinner />);
      
      // Find the inner container with size classes
      const spinnerDiv = document.querySelector('[class*="w-32 h-32"]');
      expect(spinnerDiv).toBeInTheDocument();
      expect(spinnerDiv).toHaveClass('w-32', 'h-32');
    });

    it('renders with small size when specified', () => {
      render(<Spinner size="small" />);
      
      const spinnerDiv = document.querySelector('[class*="w-8 h-8"]');
      expect(spinnerDiv).toBeInTheDocument();
      expect(spinnerDiv).toHaveClass('w-8', 'h-8');
    });

    it('renders with large size when explicitly specified', () => {
      render(<Spinner size="large" />);
      
      const spinnerDiv = document.querySelector('[class*="w-32 h-32"]');
      expect(spinnerDiv).toBeInTheDocument();
      expect(spinnerDiv).toHaveClass('w-32', 'h-32');
    });
  });

  describe('Lottie Animation', () => {
    it('loads lottie animation on mount', async () => {
      render(<Spinner />);
      
      // Wait for the dynamic import and animation loading
      await vi.waitFor(() => {
        expect(mockLottie.loadAnimation).toHaveBeenCalledTimes(1);
      });

      expect(mockLottie.loadAnimation).toHaveBeenCalledWith({
        container: expect.any(HTMLDivElement),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/fire_loader.json',
      });
    });

    it('destroys animation on unmount', async () => {
      const { unmount } = render(<Spinner />);
      
      // Wait for animation to load
      await vi.waitFor(() => {
        expect(mockLottie.loadAnimation).toHaveBeenCalled();
      });

      unmount();

      expect(mockLottieAnimation.destroy).toHaveBeenCalledTimes(1);
    });

    it('handles animation loading failure gracefully', async () => {
      // Mock loadAnimation to throw an error
      mockLottie.loadAnimation.mockImplementation(() => {
        throw new Error('Failed to load animation');
      });

      // Should not throw an error
      expect(() => render(<Spinner />)).not.toThrow();
    });

    it('does not load animation if component unmounts before import completes', async () => {
      const { unmount } = render(<Spinner />);
      
      // Unmount immediately before lottie import can complete
      unmount();

      // Wait a bit to ensure no animation is loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Animation should not be destroyed if it was never created
      expect(mockLottieAnimation.destroy).not.toHaveBeenCalled();
    });
  });

  describe('Server-Side Rendering', () => {
    it('handles SSR environment gracefully', () => {
      // Mock window as undefined to simulate SSR
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => render(<Spinner />)).not.toThrow();
      
      // Restore window
      global.window = originalWindow;
    });

    it('does not load animation in SSR environment', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      render(<Spinner />);
      
      // Animation should not be loaded in SSR
      expect(mockLottie.loadAnimation).not.toHaveBeenCalled();
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Props Handling', () => {
    it('accepts undefined size prop', () => {
      render(<Spinner size={undefined} />);
      
      // Should default to large size
      const spinnerDiv = document.querySelector('[class*="w-32 h-32"]');
      expect(spinnerDiv).toBeInTheDocument();
    });

    it('handles invalid size prop gracefully', () => {
      // @ts-ignore - Testing invalid prop value
      render(<Spinner size="invalid" />);
      
      // Should fallback to default behavior
      expect(document.querySelector('.flex')).toBeInTheDocument();
    });
  });

  describe('DOM Structure', () => {
    it('has correct container structure', () => {
      render(<Spinner />);
      
      const outerContainer = document.querySelector('.flex.justify-center.items-center.py-4');
      expect(outerContainer).toBeInTheDocument();
      
      const innerContainer = outerContainer?.querySelector('div');
      expect(innerContainer).toBeInTheDocument();
    });

    it('provides ref to lottie container', () => {
      render(<Spinner />);
      
      // The ref should be attached to an element that can receive the animation
      const containerElement = document.querySelector('[class*="w-32 h-32"]');
      expect(containerElement).toBeInTheDocument();
    });
  });

  describe('Animation Lifecycle', () => {
    it('prevents multiple animations on the same container', async () => {
      const { rerender } = render(<Spinner />);
      
      await vi.waitFor(() => {
        expect(mockLottie.loadAnimation).toHaveBeenCalledTimes(1);
      });

      // Re-render the component
      rerender(<Spinner size="small" />);
      
      // Should not create a new animation
      expect(mockLottie.loadAnimation).toHaveBeenCalledTimes(1);
    });

    it('cleans up animation reference after destroy', async () => {
      const { unmount } = render(<Spinner />);
      
      await vi.waitFor(() => {
        expect(mockLottie.loadAnimation).toHaveBeenCalled();
      });

      unmount();

      expect(mockLottieAnimation.destroy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('is accessible to screen readers', () => {
      render(<Spinner />);
      
      // The spinner should be in the document and identifiable
      const container = screen.getByRole('generic');
      expect(container).toBeInTheDocument();
    });

    it('does not interfere with keyboard navigation', () => {
      render(<Spinner />);
      
      // Spinner should not have any focusable elements
      const focusableElements = document.querySelectorAll('button, input, select, textarea, a, [tabindex]');
      expect(focusableElements).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('does not reload animation unnecessarily', async () => {
      const { rerender } = render(<Spinner />);
      
      await vi.waitFor(() => {
        expect(mockLottie.loadAnimation).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props
      rerender(<Spinner />);
      rerender(<Spinner size="large" />);
      
      // Should only load once
      expect(mockLottie.loadAnimation).toHaveBeenCalledTimes(1);
    });

    it('handles rapid mount/unmount cycles', async () => {
      const { unmount } = render(<Spinner />);
      
      // Unmount quickly
      unmount();
      
      // Render again
      render(<Spinner />);
      
      // Should handle this gracefully without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});