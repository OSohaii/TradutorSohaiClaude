import { useMemo, useState } from 'react';
import type { TokenUsage } from '../../services/api/pipelineApi';

/**
 * Per-session token + cost tracking. Resets whenever the page reloads
 * (this is intentional — the user-facing badge in the sidebar is "this
 * tab right now", not "ever").
 *
 * Pre-PR #8 this was inlined in App.tsx as two useStates plus a
 * `handleTokenUsage` closure. Pulling it into its own hook is the
 * smallest possible step toward the Phase 4 feature-folder layout
 * (`features/translator/`): the concern is small, completely
 * self-contained, and has no external dependencies beyond the BFF's
 * `TokenUsage` type. Pipeline extraction is the next step but stays
 * out of this PR because of its coupling to App.tsx's settings-modal
 * UI state.
 *
 * Pricing tiers below are estimates (USD per 1M tokens) and only
 * apply to Gemini variants; non-Gemini engines (DeepL, Google
 * Translate, Torii) report 0 tokens through this code path so they
 * don't influence the running total.
 */
const PRICING = {
  flash: { input: 0.1, output: 0.4 },
  pro: { input: 1.25, output: 5.0 },
} as const;

export interface TokenTracker {
  /** Cumulative input/output token counts since page load. */
  totalTokens: { input: number; output: number };
  /** Cumulative estimated USD cost since page load. */
  totalCost: number;
  /** Sum of `totalTokens.input + totalTokens.output`. */
  displayedTotalTokens: number;
  /** Feed a `TokenUsage` payload from the BFF pipeline response. */
  handleTokenUsage: (data: TokenUsage) => void;
}

export const useTokenTracker = (): TokenTracker => {
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });
  const [totalCost, setTotalCost] = useState(0);

  const handleTokenUsage = (data: TokenUsage): void => {
    setTotalTokens(prev => ({
      input: prev.input + data.input,
      output: prev.output + data.output,
    }));

    const model = (data.model || '').toLowerCase();
    const tier =
      model.includes('flash') || model.includes('lite') ? PRICING.flash : PRICING.pro;
    const costIn = (data.input / 1_000_000) * tier.input;
    const costOut = (data.output / 1_000_000) * tier.output;
    setTotalCost(prev => prev + costIn + costOut);
  };

  const displayedTotalTokens = useMemo(
    () => totalTokens.input + totalTokens.output,
    [totalTokens.input, totalTokens.output],
  );

  return { totalTokens, totalCost, displayedTotalTokens, handleTokenUsage };
};
