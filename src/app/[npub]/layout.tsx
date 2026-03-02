import { Metadata } from "next";
import { shortenPubkey } from "@/lib/utils/nip19";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ npub: string }> 
}): Promise<Metadata> {
  const { npub } = await params;
  const title = `Profile (${shortenPubkey(npub)})`;
  
  return {
    title,
    description: `View ${shortenPubkey(npub)}'s profile on Tell it!, a decentralized microblogging platform.`,
    openGraph: {
      title: `${title} | Tell it!`,
      description: `View ${shortenPubkey(npub)}'s profile on Tell it!.`,
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
