import type { Meta, StoryObj } from "@storybook/react-vite";
import Byline from "@/components/Byline";
import { INSTRUCTOR_FALLBACK, AUTHOR_FALLBACK } from "@/lib/cardStyles";
import { LONG_INSTRUCTOR, SHORT_INSTRUCTOR } from "./_fixtures";

const meta: Meta<typeof Byline> = {
  title: "Cards/Byline",
  component: Byline,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof Byline>;

const Frame = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-6 max-w-sm rounded-xl border border-border/60 bg-card p-4">
    <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    {children}
  </div>
);

export const ShortInstructor: Story = {
  render: () => (
    <Frame label="Short instructor name">
      <Byline value={SHORT_INSTRUCTOR} emptyText={INSTRUCTOR_FALLBACK} />
    </Frame>
  ),
};

export const LongInstructor: Story = {
  render: () => (
    <Frame label="Very long instructor name (line-clamp engaged)">
      <Byline value={LONG_INSTRUCTOR} emptyText={INSTRUCTOR_FALLBACK} />
    </Frame>
  ),
};

export const EmptyInstructor: Story = {
  render: () => (
    <Frame label="Empty → Bengali fallback (italic muted)">
      <Byline value="" emptyText={INSTRUCTOR_FALLBACK} />
    </Frame>
  ),
};

export const EmptyAuthor: Story = {
  render: () => (
    <Frame label="Empty author → fallback">
      <Byline value={null} emptyText={AUTHOR_FALLBACK} />
    </Frame>
  ),
};

export const SkeletonShimmer: Story = {
  render: () => (
    <Frame label="Skeleton (shimmer) — identical reserved height">
      <Byline.Skeleton />
    </Frame>
  ),
};

export const SkeletonPulse: Story = {
  render: () => (
    <Frame label="Skeleton (pulse, narrower)">
      <Byline.Skeleton variant="pulse" widthClass="w-2/5" />
    </Frame>
  ),
};

export const SideBySideLayoutCheck: Story = {
  name: "Layout stability: skeleton ↔ short ↔ long",
  render: () => (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
      <Frame label="Skeleton">
        <Byline.Skeleton />
      </Frame>
      <Frame label="Short">
        <Byline value={SHORT_INSTRUCTOR} emptyText={INSTRUCTOR_FALLBACK} />
      </Frame>
      <Frame label="Long (clamped)">
        <Byline value={LONG_INSTRUCTOR} emptyText={INSTRUCTOR_FALLBACK} />
      </Frame>
    </div>
  ),
};