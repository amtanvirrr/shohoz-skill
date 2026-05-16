import type { Meta, StoryObj } from "@storybook/react-vite";
import BookCard from "@/components/cards/BookCard";
import FeaturedCardSkeleton from "@/components/FeaturedCardSkeleton";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { baseBook, LONG_AUTHOR, SHORT_AUTHOR } from "./_fixtures";

const meta: Meta<typeof BookCard> = {
  title: "Cards/BookCard",
  component: BookCard,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof BookCard>;

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

export const FeaturedShortAuthor: Story = {
  render: () => (
    <Grid>
      <BookCard
        book={{ ...baseBook, author: SHORT_AUTHOR }}
        variant="featured"
        cta={{ text: "অর্ডার করুন", tone: "primary" }}
        descriptionPreview={baseBook.description ?? ""}
      />
    </Grid>
  ),
};

export const FeaturedLongAuthor: Story = {
  render: () => (
    <Grid>
      <BookCard
        book={{ ...baseBook, author: LONG_AUTHOR }}
        variant="featured"
        cta={{ text: "অর্ডার করুন", tone: "primary" }}
        descriptionPreview={baseBook.description ?? ""}
      />
    </Grid>
  ),
};

export const FeaturedEmptyAuthor: Story = {
  render: () => (
    <Grid>
      <BookCard
        book={{ ...baseBook, author: "" }}
        variant="featured"
        cta={{ text: "অর্ডার করুন", tone: "primary" }}
        descriptionPreview={baseBook.description ?? ""}
      />
    </Grid>
  ),
};

export const CompactVariants: Story = {
  name: "Compact: short / long / empty",
  render: () => (
    <Grid>
      <BookCard book={{ ...baseBook, author: SHORT_AUTHOR }} variant="compact" />
      <BookCard book={{ ...baseBook, author: LONG_AUTHOR }} variant="compact" />
      <BookCard book={{ ...baseBook, author: "" }} variant="compact" />
    </Grid>
  ),
};

export const LayoutStabilityWithSkeleton: Story = {
  name: "Skeleton ↔ loaded: layout stays consistent",
  render: () => (
    <Grid>
      <FeaturedCardSkeleton aspect="portrait" />
      <BookCard
        book={{ ...baseBook, author: SHORT_AUTHOR }}
        variant="featured"
        cta={{ text: "অর্ডার করুন", tone: "primary" }}
        descriptionPreview={baseBook.description ?? ""}
      />
      <BookCard
        book={{ ...baseBook, author: LONG_AUTHOR }}
        variant="featured"
        cta={{ text: "অর্ডার করুন", tone: "primary" }}
        descriptionPreview={baseBook.description ?? ""}
      />
    </Grid>
  ),
};

export const CompactSkeletonStability: Story = {
  name: "Compact: skeleton vs short vs long",
  render: () => (
    <div className="grid max-w-5xl gap-4 sm:grid-cols-3">
      <ProductCardSkeleton aspect="portrait" count={1} />
      <BookCard book={{ ...baseBook, author: SHORT_AUTHOR }} variant="compact" />
      <BookCard book={{ ...baseBook, author: LONG_AUTHOR }} variant="compact" />
    </div>
  ),
};