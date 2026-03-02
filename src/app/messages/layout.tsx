import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "Secure and private direct messages on Nostr.",
  robots: {
    index: false,
  },
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
