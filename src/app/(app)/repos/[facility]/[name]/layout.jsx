import { RepoLayout } from "@/redesign/pages/repo/repo-layout";

export async function generateMetadata({ params }) {
  const { facility, name } = await params;
  return { title: `${decodeURIComponent(name)} · ${decodeURIComponent(facility)} · Coact` };
}

export default async function Layout({ params, children }) {
  const { facility, name } = await params;
  return <RepoLayout facility={decodeURIComponent(facility)} name={decodeURIComponent(name)}>{children}</RepoLayout>;
}
