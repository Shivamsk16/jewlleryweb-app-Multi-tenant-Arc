import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function SuperAdminLoginRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const qs = params.redirect ? `?redirect=${encodeURIComponent(params.redirect)}` : "";
  redirect(`/login${qs}`);
}
