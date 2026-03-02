import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Stay updated with your interactions on Tell it!.",
  robots: {
    index: false,
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
