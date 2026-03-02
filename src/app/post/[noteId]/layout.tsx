import { Metadata } from "next";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ noteId: string }> 
}): Promise<Metadata> {
  const { noteId } = await params;
  const title = `Post ${noteId.slice(0, 8)}...`;
  
  return {
    title,
    description: "Read this post on Tell it!, a decentralized microblogging platform.",
    openGraph: {
      title: `${title} | Tell it!`,
      description: "Read this post on Tell it!.",
    },
  };
}

export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
