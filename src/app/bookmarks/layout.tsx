import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Your saved posts and articles on Tell it!.",
  robots: {
    index: false,
  },
};

export default function BookmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
