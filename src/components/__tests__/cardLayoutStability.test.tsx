import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  BYLINE_LAYOUT_CLASS,
  bylineClass,
  CARD_TITLE_CLASS,
  CARD_DESCRIPTION_CLASS,
} from "@/lib/cardStyles";
import Byline from "@/components/Byline";
import FeaturedCardSkeleton from "@/components/FeaturedCardSkeleton";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import CourseCard, { type CourseCardCourse } from "@/components/cards/CourseCard";
import BookCard, { type BookCardBook } from "@/components/cards/BookCard";

/**
 * Visual-regression guard for card height shifts between loading and loaded states.
 *
 * The instructor/author byline reserves a fixed min-height at every breakpoint.
 * If a skeleton or card stops sharing the BYLINE_LAYOUT_CLASS tokens, the card
 * will visibly jump on data load — these assertions fail before that ships.
 */

const MIN_H_TOKENS = ["min-h-[2.5rem]", "sm:min-h-[2.75rem]", "md:min-h-[1.5rem]"];
const LEADING_TOKENS = ["leading-5", "sm:leading-[1.375rem]", "md:leading-6"];

// Title row: two-line clamp with reserved height that grows at sm.
const TITLE_MIN_H_TOKENS = ["min-h-[2.5rem]", "sm:min-h-[3.25rem]"];
const TITLE_CLAMP_TOKEN = "line-clamp-2";

// Description preview: two-line clamp with reserved height.
const DESC_MIN_H_TOKENS = ["min-h-[2rem]", "sm:min-h-[2.25rem]"];
const DESC_CLAMP_TOKEN = "line-clamp-2";

// Skeleton title bar (h-5) and price bar (h-6) widths used by both skeletons.
const TITLE_SKELETON_TOKEN = "h-5 w-4/5";
const PRICE_SKELETON_TOKEN = "h-6 w-20";

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

describe("card layout stability — title tokens", () => {
  it("CARD_TITLE_CLASS reserves min-heights and clamps to 2 lines", () => {
    expectAllTokens(CARD_TITLE_CLASS, TITLE_MIN_H_TOKENS);
    expect(CARD_TITLE_CLASS).toContain(TITLE_CLAMP_TOKEN);
  });

  it("CourseCard featured renders <h3> with CARD_TITLE_CLASS tokens", () => {
    const course: CourseCardCourse = {
      id: "c1",
      title: "Test Course",
      slug: "test",
      instructor: "Engr. T",
      price: 100,
      original_price: 200,
      image_url: "",
      category: "Cat",
      duration: "1h",
    };
    const { container } = render(
      <MemoryRouter>
        <CourseCard course={course} variant="featured" cta={{ text: "Buy", tone: "primary" }} />
      </MemoryRouter>,
    );
    const h3 = container.querySelector("h3")!;
    expect(h3).not.toBeNull();
    expectAllTokens(h3.className, TITLE_MIN_H_TOKENS);
    expect(h3.className).toContain(TITLE_CLAMP_TOKEN);
  });

  it("BookCard featured renders <h3> with CARD_TITLE_CLASS tokens", () => {
    const book: BookCardBook = {
      id: "b1",
      title: "Test Book",
      slug: "test",
      author: "Author",
      price: 100,
      original_price: 150,
      image_url: "",
      category: "Cat",
      book_type: "physical",
    };
    const { container } = render(
      <MemoryRouter>
        <BookCard book={book} variant="featured" cta={{ text: "Buy", tone: "primary" }} />
      </MemoryRouter>,
    );
    const h3 = container.querySelector("h3")!;
    expect(h3).not.toBeNull();
    expectAllTokens(h3.className, TITLE_MIN_H_TOKENS);
    expect(h3.className).toContain(TITLE_CLAMP_TOKEN);
  });

  it("Skeletons reserve a title bar of identical width to the card title row", () => {
    const featured = render(<FeaturedCardSkeleton aspect="video" />).container.innerHTML;
    const product = render(<ProductCardSkeleton count={1} />).container.innerHTML;
    expect(featured).toContain(TITLE_SKELETON_TOKEN);
    expect(product).toContain(TITLE_SKELETON_TOKEN);
  });
});

describe("card layout stability — description tokens", () => {
  it("CARD_DESCRIPTION_CLASS reserves min-heights and clamps to 2 lines", () => {
    expectAllTokens(CARD_DESCRIPTION_CLASS, DESC_MIN_H_TOKENS);
    expect(CARD_DESCRIPTION_CLASS).toContain(DESC_CLAMP_TOKEN);
  });

  it("CourseCard renders description preview with CARD_DESCRIPTION_CLASS tokens", () => {
    const course: CourseCardCourse = {
      id: "c1",
      title: "T",
      slug: "t",
      instructor: "I",
      price: 100,
      original_price: null,
      image_url: "",
      category: "C",
      duration: "1h",
    };
    const { container } = render(
      <MemoryRouter>
        <CourseCard
          course={course}
          variant="featured"
          cta={{ text: "Buy", tone: "primary" }}
          descriptionPreview="Some preview text"
        />
      </MemoryRouter>,
    );
    const desc = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Some preview text"),
    )!;
    expect(desc).toBeTruthy();
    expectAllTokens(desc.className, DESC_MIN_H_TOKENS);
    expect(desc.className).toContain(DESC_CLAMP_TOKEN);
  });
});

describe("card layout stability — pricing row", () => {
  it("FeaturedCardSkeleton reserves a price bar matching the card price row", () => {
    const html = render(<FeaturedCardSkeleton aspect="video" />).container.innerHTML;
    expect(html).toContain(PRICE_SKELETON_TOKEN);
  });

  it("ProductCardSkeleton reserves a price bar matching the card price row", () => {
    const html = render(<ProductCardSkeleton count={1} />).container.innerHTML;
    expect(html).toContain(PRICE_SKELETON_TOKEN);
  });
});
