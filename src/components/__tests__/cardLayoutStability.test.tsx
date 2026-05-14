import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BYLINE_LAYOUT_CLASS, bylineClass } from "@/lib/cardStyles";
import Byline from "@/components/Byline";
import FeaturedCardSkeleton from "@/components/FeaturedCardSkeleton";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

/**
 * Visual-regression guard for card height shifts between loading and loaded states.
 *
 * The instructor/author byline reserves a fixed min-height at every breakpoint.
 * If a skeleton or card stops sharing the BYLINE_LAYOUT_CLASS tokens, the card
 * will visibly jump on data load — these assertions fail before that ships.
 */

const MIN_H_TOKENS = ["min-h-[2.5rem]", "sm:min-h-[2.75rem]", "md:min-h-[1.5rem]"];
const LEADING_TOKENS = ["leading-5", "sm:leading-[1.375rem]", "md:leading-6"];

const expectAllTokens = (cls: string, tokens: string[]) => {
  for (const t of tokens) expect(cls).toContain(t);
};

describe("card layout stability — byline tokens", () => {
  it("BYLINE_LAYOUT_CLASS reserves identical min-heights at every breakpoint", () => {
    expectAllTokens(BYLINE_LAYOUT_CLASS, MIN_H_TOKENS);
    expectAllTokens(BYLINE_LAYOUT_CLASS, LEADING_TOKENS);
  });

  it("bylineClass() output (cards) contains the shared layout tokens", () => {
    const filled = bylineClass("Some Author");
    const empty = bylineClass("");
    expectAllTokens(filled, MIN_H_TOKENS);
    expectAllTokens(empty, MIN_H_TOKENS);
  });

  it("<Byline> renders a <p> using the shared layout tokens", () => {
    const { container } = render(<Byline value="Engr. Test" emptyText="Fallback" />);
    const p = container.querySelector("p")!;
    expect(p).not.toBeNull();
    expectAllTokens(p.className, MIN_H_TOKENS);
  });

  it("FeaturedCardSkeleton byline placeholder uses the same min-height tokens", () => {
    const { container } = render(<FeaturedCardSkeleton aspect="video" />);
    const html = container.innerHTML;
    expectAllTokens(html, MIN_H_TOKENS);
  });

  it("ProductCardSkeleton byline placeholder uses the same min-height tokens", () => {
    const { container } = render(<ProductCardSkeleton count={1} />);
    const html = container.innerHTML;
    expectAllTokens(html, MIN_H_TOKENS);
  });
});
