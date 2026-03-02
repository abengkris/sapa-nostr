import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for people, hashtags, and content on the Nostr network.",
  openGraph: {
    title: "Search | Tell it!",
    description: "Search for people, hashtags, and content on the Nostr network.",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
