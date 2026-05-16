import type { Meta, StoryObj } from "@storybook/react-vite";
import CourseCard from "@/components/cards/CourseCard";
import FeaturedCardSkeleton from "@/components/FeaturedCardSkeleton";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { baseCourse, LONG_INSTRUCTOR, SHORT_INSTRUCTOR } from "./_fixtures";

const meta: Meta<typeof CourseCard> = {
  title: "Cards/CourseCard",
  component: CourseCard,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof CourseCard>;

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

export const FeaturedShortInstructor: Story = {
  render: () => (
    <Grid>
      <CourseCard
        course={{ ...baseCourse, instructor: SHORT_INSTRUCTOR }}
        variant="featured"
        cta={{ text: "এনরোল করুন", tone: "primary" }}
        descriptionPreview={baseCourse.description ?? ""}
      />
    </Grid>
  ),
};

export const FeaturedLongInstructor: Story = {
  render: () => (
    <Grid>
      <CourseCard
        course={{ ...baseCourse, instructor: LONG_INSTRUCTOR }}
        variant="featured"
        cta={{ text: "এনরোল করুন", tone: "primary" }}
        descriptionPreview={baseCourse.description ?? ""}
      />
    </Grid>
  ),
};

export const FeaturedEmptyInstructor: Story = {
  render: () => (
    <Grid>
      <CourseCard
        course={{ ...baseCourse, instructor: "" }}
        variant="featured"
        cta={{ text: "এনরোল করুন", tone: "primary" }}
        descriptionPreview={baseCourse.description ?? ""}
      />
    </Grid>
  ),
};

export const CompactVariants: Story = {
  name: "Compact: short / long / empty",
  render: () => (
    <Grid>
      <CourseCard course={{ ...baseCourse, instructor: SHORT_INSTRUCTOR }} variant="compact" />
      <CourseCard course={{ ...baseCourse, instructor: LONG_INSTRUCTOR }} variant="compact" />
      <CourseCard course={{ ...baseCourse, instructor: "" }} variant="compact" />
    </Grid>
  ),
};

export const LayoutStabilityWithSkeleton: Story = {
  name: "Skeleton ↔ loaded: layout stays consistent",
  render: () => (
    <Grid>
      <FeaturedCardSkeleton aspect="video" />
      <CourseCard
        course={{ ...baseCourse, instructor: SHORT_INSTRUCTOR }}
        variant="featured"
        cta={{ text: "এনরোল করুন", tone: "primary" }}
        descriptionPreview={baseCourse.description ?? ""}
      />
      <CourseCard
        course={{ ...baseCourse, instructor: LONG_INSTRUCTOR }}
        variant="featured"
        cta={{ text: "এনরোল করুন", tone: "primary" }}
        descriptionPreview={baseCourse.description ?? ""}
      />
    </Grid>
  ),
};

export const CompactSkeletonStability: Story = {
  name: "Compact: skeleton vs short vs long",
  render: () => (
    <div className="grid max-w-5xl gap-4 sm:grid-cols-3">
      <ProductCardSkeleton aspect="video" count={1} />
      <CourseCard course={{ ...baseCourse, instructor: SHORT_INSTRUCTOR }} variant="compact" />
      <CourseCard course={{ ...baseCourse, instructor: LONG_INSTRUCTOR }} variant="compact" />
    </div>
  ),
};